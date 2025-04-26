import {
  Controller,
  Post,
  Delete,
  Patch,
  Get,
  Query,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { GenerateFeedbackParams } from '../shared/dto/generate-feedback.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback, FeedbackDocument } from './entities/feedback.entity';

@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,

    @InjectModel(Feedback.name)
    private feedbackModel: Model<FeedbackDocument>,
  ) {}

  //Obtener el estado del feedback por nombre de repositorio
  @Get('status/:repo')
  async getFeedbackStatus(@Param('repo') repo: string) {
    if (!repo || typeof repo !== 'string' || repo.trim() === '') {
      throw new HttpException(
        'El parámetro "repo" es requerido y debe ser válido.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const feedback = await this.feedbackModel.findOne({ repo });

    if (!feedback) {
      return {
        repo,
        status: 'Pendiente',
        message: 'Este repositorio aún no tiene feedback generado.',
      };
    }

    return {
      repo,
      status: feedback.status,
      message: 'Estado actual del feedback recuperado correctamente.',
    };
  }

  //Generar feedback con Deepseek
  @Post(':repo/deepseek')
  async generateWithDeepseek(
    @Param('repo') repo: string,
    @Body() body: Omit<GenerateFeedbackParams, 'repo'>,
  ) {
    try {
      const feedback = await this.feedbackService.generateFeedbackWithDeepseek({
        repo,
        ...body,
      });
      return { message: 'Feedback generado con DeepSeek', feedback };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  //Generar feedback con OpenAI
  @Post(':repo/openai')
  async generateWithOpenAI(
    @Param('repo') repo: string,
    @Body() body: Omit<GenerateFeedbackParams, 'repo'>,
  ) {
    try {
      const feedback = await this.feedbackService.generateFeedbackWithOpenAI({
        repo,
        ...body,
      });
      return { message: 'Feedback generado con OpenAI', feedback };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Post(':repo/gemini')
  async generateWithGemini(
    @Param('repo') repo: string,
    @Body() body: Omit<GenerateFeedbackParams, 'repo'>,
  ) {
    try {
      const feedback = await this.feedbackService.generateFeedbackWithGemini({
        repo,
        ...body,
      });
      return { message: 'Feedback generado con Gemini', feedback };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  //Obtener feedback por email y tarea
  @Get('search')
  async getFeedbackByEmailAndTask(
    @Query('email') email: string,
    @Query('idTaskGithubClassroom') idTaskGithubClassroom: string,
  ) {
    if (!email || !idTaskGithubClassroom) {
      throw new HttpException(
        'Se requieren los parámetros email y task',
        HttpStatus.BAD_REQUEST,
      );
    }

    const feedbackData = await this.feedbackModel.findOne({
      email,
      idTaskGithubClassroom,
    });

    if (!feedbackData) {
      throw new HttpException(
        'No se encontró feedback para este estudiante en esta tarea',
        HttpStatus.NOT_FOUND,
      );
    }

    return feedbackData;
  }

  //Actualizar el feedback
  @Patch('update')
  async updateFeedbackByQuery(
    @Query('email') email: string,
    @Query('idTaskGithubClassroom') idTaskGithubClassroom: string,
    @Body('feedback') feedback: string,
  ) {
    if (!email || !idTaskGithubClassroom || !feedback) {
      throw new HttpException(
        'Los campos email, task y feedback son requeridos.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.feedbackModel.findOneAndUpdate(
      { email, idTaskGithubClassroom },
      { feedback },
      { new: true },
    );

    if (!updated) {
      throw new HttpException(
        'No se encontró una retroalimentación con ese email y tarea.',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Feedback actualizado correctamente.',
      data: updated,
    };
  }

  //Eliminar el feedback
  @Delete('delete')
  async deleteFeedbackByQuery(
    @Query('email') email: string,
    @Query('idTaskGithubClassroom') idTaskGithubClassroom: string,
  ) {
    if (!email || !idTaskGithubClassroom) {
      throw new HttpException(
        'Los campos email y idTaskGithubClassroom son requeridos.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const deleted = await this.feedbackModel.findOneAndDelete({
      email,
      idTaskGithubClassroom,
    });

    if (!deleted) {
      throw new HttpException(
        'No se encontró retroalimentación con ese email y tarea.',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Feedback eliminado correctamente.',
      data: deleted,
    };
  }
}
