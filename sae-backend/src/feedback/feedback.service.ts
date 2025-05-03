import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Model } from 'mongoose';
import { Feedback, FeedbackDocument } from './entities/feedback.entity';
import {
  Model as AIModel,
  ModelDocument,
} from '../model-type/entities/model.entity';
import { buildFeedbackPrompt } from '../shared/prompts/feedback-prompt.template';
import { GenerateFeedbackParams } from '../shared/dto/generate-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectModel(Feedback.name)
    private feedbackModel: Model<FeedbackDocument>,

    @InjectModel(AIModel.name)
    private modelModel: Model<ModelDocument>,
  ) {}

  // Método para guardar el feedback en MongoDB
  private async saveFeedbackToDB(data: {
    repo: string;
    email: string;
    idTaskGithubClassroom: string;
    feedback: string;
    gradeValue: number;
    gradeTotal: number;
    modelIA?: string;
    status?: string;
  }) {
    await this.feedbackModel.create({
      ...data,
    });
    this.logger.log(`Feedback guardado en MongoDB para ${data.repo}`);
  }

  // Método para generar feedback con Deepseek
  async generateFeedbackWithDeepseek(
    params: GenerateFeedbackParams,
  ): Promise<string> {
    const prompt = buildFeedbackPrompt(params.readme, params.code, {
      language: params.language,
      subject: params.subject,
      studentLevel: params.studentLevel,
      topics: params.topics,
      constraints: params.constraints,
      style: params.style,
    });

    try {
      const model = await this.modelModel.findById(params.modelId);
      if (!model) {
        throw new Error('Modelo de IA no encontrado.');
      }

      const deepseek = new OpenAI({
        apiKey: model.apiKey,
        baseURL: 'https://api.deepseek.com',
      });

      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: prompt }],
        temperature: 1,
        top_p: 0.95,
      });

      const feedback =
        response?.choices?.[0]?.message?.content ||
        'No se pudo generar feedback.';
      await this.saveFeedbackToDB({
        ...params,
        feedback,
        status: 'Generado',
        modelIA: 'Deepseek',
      });

      return feedback;
    } catch (error) {
      this.logger.error('Error generando feedback con Deepseek', error);
      throw new Error('No se pudo generar la retroalimentación.');
    }
  }

  // Método para generar feedback con OpenAI
  async generateFeedbackWithOpenAI(
    params: GenerateFeedbackParams,
  ): Promise<string> {
    const prompt = buildFeedbackPrompt(params.readme, params.code, {
      language: params.language,
      subject: params.subject,
      studentLevel: params.studentLevel,
      topics: params.topics,
      constraints: params.constraints,
      style: params.style,
    });

    try {
      const model = await this.modelModel.findById(params.modelId);
      if (!model) {
        throw new Error('Modelo de IA no encontrado.');
      }

      const openai = new OpenAI({ apiKey: model.apiKey });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          {
            role: 'user',
            content:
              'Por favor, proporciona una evaluación detallada del código proporcionado.',
          },
        ],
        temperature: 0.7,
        top_p: 0.95,
      });

      const feedback =
        response?.choices?.[0]?.message?.content ||
        'No se pudo generar feedback.';
      await this.saveFeedbackToDB({
        ...params,
        feedback,
        status: 'Generado',
        modelIA: 'OpenAI',
      });

      return feedback;
    } catch (error) {
      this.logger.error('Error generando feedback con OpenAI', error);
      throw new Error('No se pudo generar la retroalimentación.');
    }
  }

  //Método para generar feedback con Gemini
  async generateFeedbackWithGemini(
    params: GenerateFeedbackParams,
  ): Promise<string> {
    const {
      modelId,
      repo,
      readme,
      code,
      email,
      gradeValue,
      gradeTotal,
      idTaskGithubClassroom,
      language,
      subject,
      studentLevel,
      topics,
      constraints,
      style,
    } = params;

    const model = await this.modelModel.findById(modelId);
    if (!model) {
      throw new Error('El modelo con ese ID no existe.');
    }

    const prompt = buildFeedbackPrompt(readme, code, {
      language,
      subject,
      studentLevel,
      topics,
      constraints,
      style,
    });

    try {
      const generationConfig = {
        temperature: 1,
        top_p: 0.95,
        top_k: 40,
        max_output_tokens: 8192,
        response_mime_type: 'text/plain',
      };

      const geminiClient = new GoogleGenerativeAI(model.apiKey);

      const genModel = geminiClient.getGenerativeModel({
        model: 'gemini-2.0-flash-lite',
        generationConfig,
      });

      const result = await genModel.generateContent(prompt);
      const feedback =
        result?.response?.text() || 'No se pudo generar feedback.';
      await this.saveFeedbackToDB({
        ...params,
        feedback,
        status: 'Generado',
        modelIA: 'Gemini',
      });

      return feedback;
    } catch (error) {
      this.logger.error('Error generando feedback con Gemini', error);
      throw new Error('No se pudo generar la retroalimentación.');
    }
  }
}
