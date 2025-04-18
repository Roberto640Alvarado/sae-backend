import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Model } from 'mongoose';
import { Feedback, FeedbackDocument } from './entities/feedback.entity';
import { buildFeedbackPrompt } from '../shared/prompts/feedback-prompt.template';
import { GenerateFeedbackParams } from '../shared/dto/generate-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  //Cliente de deepseek
  private readonly deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  //Cliennte de OpenAI
  private readonly openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  //Cliente de Gemini
  private readonly gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  constructor(
    @InjectModel(Feedback.name)
    private feedbackModel: Model<FeedbackDocument>,
  ) {}

  // Método para guardar el feedback en MongoDB
  private async saveFeedbackToDB(data: {
    repo: string;
    email: string;
    task: string;
    feedback: string;
    gradeValue: number;
    gradeTotal: number;
    modelIA?: string;
    status?: string;
  }) {
    await this.feedbackModel.create({
      ...data,
      status: 'generated',
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
      const response = await this.deepseek.chat.completions.create({
        model: 'deepseek-reasoner',
        messages: [
          { role: 'system', content: prompt },
          {
            role: 'user',
            content:
              'Por favor, proporciona una retroalimentación detallada del código proporcionado.',
          },
        ],
        temperature: 1,
        top_p: 0.95,
      });

      const feedback =
        response?.choices?.[0]?.message?.content ||
        'No se pudo generar feedback.';
      await this.saveFeedbackToDB({ ...params, feedback, status: 'generated' });

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
      const response = await this.openai.chat.completions.create({
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
      await this.saveFeedbackToDB({ ...params, feedback, status: 'generated'  });

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
    const prompt = buildFeedbackPrompt(params.readme, params.code, {
      language: params.language,
      subject: params.subject,
      studentLevel: params.studentLevel,
      topics: params.topics,
      constraints: params.constraints,
      style: params.style,
    });

    try {
      const generationConfig = {
        temperature: 1,
        top_p: 0.95,
        top_k: 40,
        max_output_tokens: 8192,
        response_mime_type: 'text/plain',
      };

      const model = this.gemini.getGenerativeModel({
        model: 'gemini-1.5-pro',
        generationConfig,
      });

      const result = await model.generateContent(prompt);
      const feedback =
        result?.response?.text() || 'No se pudo generar feedback.';
      await this.saveFeedbackToDB({ ...params, feedback, status: 'generated'  });

      return feedback;
    } catch (error) {
      this.logger.error('Error generando feedback con Gemini', error);
      throw new Error('No se pudo generar la retroalimentación.');
    }
  }
}
