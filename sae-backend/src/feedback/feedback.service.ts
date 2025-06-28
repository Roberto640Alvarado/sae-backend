import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Model } from 'mongoose';
import { Feedback, FeedbackDocument } from './entities/feedback.entity';
import {
  Model as AIModel,
  ModelDocument,
} from '../model-type/entities/model.entity';
import {
  ModelType,
  ModelTypeDocument,
} from '../model-type/entities/model-type.entity';
import { GenerateFeedbackParams } from './dto/generate-feedback.dto';
import { MCPRequest } from './dto/mcp-feedback.dto';
import { buildMCPPromptParts } from './prompts/build-mcp-prompt';
import { extractGradeFromFeedback } from './utils/regex.util';
import { decrypt } from '../utils/encryption.util';
import {
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectModel(Feedback.name)
    private feedbackModel: Model<FeedbackDocument>,

    @InjectModel(AIModel.name)
    private modelModel: Model<ModelDocument>,

    @InjectModel(ModelType.name)
    private modelTypeModel: Model<ModelTypeDocument>,
  ) {}

  //Método para guardar el feedback en MongoDB
  private async saveFeedbackToDB(data: {
    repo: string;
    email: string;
    idTaskGithubClassroom: string;
    feedback: string;
    gradeFeedback: number;
    gradeValue: number;
    gradeTotal: number;
    modelIA?: string;
    reviewedBy?: string;
    status?: string;
    durationMs?: number;
  }) {
    await this.feedbackModel.create({
      ...data,
    });
    this.logger.log(`Feedback guardado en MongoDB para ${data.repo}`);
  }

  //-------------------------------Método para generar retroalimentacion--------------------------------------
  async generateFeedback(params: GenerateFeedbackParams): Promise<string> {
    try {
      //Verificar si el modelo existe
      const start = Date.now();
      const model = await this.modelModel.findById(params.modelId);
      if (!model) {
        throw new Error('Modelo de IA no encontrado.');
      }

      console.log('Modelo encontrado:', model);

      //Extraer nombre del modelo
      const modelName = model.version;
      if (!modelName) {
        throw new Error('Nombre del modelo no encontrado.');
      }

      //Api Key desencriptada
      const apiKey = decrypt(model.apiKey);
      if (!apiKey) {
        throw new Error('API Key no encontrada o inválida.');
      }

      //Extraer nombre del proveedor de IA
      const modelTypeIA = await this.modelTypeModel.findById(model.modelType);
      const provider = (modelTypeIA?.name || 'Desconocido') as 'OpenAI' | 'DeepSeek' | 'Gemini';

      const { context, instruction, input, userPrompt } = buildMCPPromptParts(
        params.readme,
        params.code,
        {
          language: params.language,
          subject: params.subject,
          studentLevel: params.studentLevel,
          topics: params.topics,
          constraints: params.constraints,
          style: params.style,
        },
      );

      const mcp = {
        context,
        instruction,
        input,
        userPrompt,
        model: {
          name: modelName,
          provider,
          temperature: provider === 'OpenAI' ? 0.7 : 1,
        },
      };

      let feedback = '';

      switch (provider) {
        case 'OpenAI':
          feedback = await this.callOpenAI(mcp, apiKey);
          break;
        case 'DeepSeek':
          feedback = await this.callDeepSeek(mcp, apiKey);
          break;
        case 'Gemini':
          feedback = await this.callGemini(mcp, apiKey);
          break;
        default:
          throw new Error(`Proveedor de modelo no soportado: ${provider}`);
      }

      const gradeFeedback = extractGradeFromFeedback(feedback);

      const duration = Date.now() - start;

      await this.saveFeedbackToDB({
        ...params,
        feedback,
        gradeFeedback,
        status: 'Generado',
        modelIA: provider,
        durationMs: duration,
      });

      return feedback;
    } catch (error) {
      this.logger.error('Error al generar la retroalimentación:', error);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  //----------------------------------------------------------------------------------------------------------

  //-------------------------------Método para llamar a OpenAI------------------------------------------------
  private async callOpenAI(mcp: MCPRequest, apiKey: string): Promise<string> {
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: mcp.model.name,
      messages: [
        { role: 'system', content: `${mcp.context}\n\n${mcp.instruction}\n\n${mcp.input}` },
        {
          role: 'user',
          content: mcp.userPrompt || mcp.input,
        },
      ],
      temperature: mcp.model.temperature,
      top_p: 0.95,
    });

    return (
      response?.choices?.[0]?.message?.content || 'No se pudo generar feedback.'
    );
  }
  //----------------------------------------------------------------------------------------------------------

  //-------------------------------Método para llamar a DeepSeek----------------------------------------------
  private async callDeepSeek(mcp: MCPRequest, apiKey: string): Promise<string> {
    const deepseek = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
    });

    const isReasoner = mcp.model.name === 'deepseek-reasoner';

    let messages: ChatCompletionMessageParam[];

    if (isReasoner) {
      messages = [
        {
          role: 'system',
          content: `${mcp.context}\n\n${mcp.instruction}\n\n${mcp.input}`,
        },
        {
          role: 'user',
          content: mcp.userPrompt || mcp.input,
        },
      ];
    } else {
      messages = [
        {
          role: 'system',
          content: `${mcp.context}\n\n${mcp.instruction}\n\n${mcp.input}`,
        },
      ];
    }

    const response = await deepseek.chat.completions.create({
      model: mcp.model.name,
      messages,
      temperature: mcp.model.temperature,
      top_p: 0.95,
    });

    return (
      response?.choices?.[0]?.message?.content || 'No se pudo generar feedback.'
    );
  }
  //----------------------------------------------------------------------------------------------------------

  //-------------------------------Método para llamar a Gemini------------------------------------------------
  private async callGemini(mcp: MCPRequest, apiKey: string): Promise<string> {
    const geminiClient = new GoogleGenerativeAI(apiKey);

    const genModel = geminiClient.getGenerativeModel({
      model: mcp.model.name,
      generationConfig: {
        temperature: mcp.model.temperature,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });

    const prompts = [
      `${mcp.context}\n\n${mcp.instruction}\n\n${mcp.input}`,
    ];

    const result = await genModel.generateContent(prompts);

    return result?.response?.text() || 'No se pudo generar feedback.';
  }
  //------------------------------------------------------------------------------------------------------
}
