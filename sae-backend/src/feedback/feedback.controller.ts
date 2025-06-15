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
  Headers,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { GenerateFeedbackParams } from '../shared/dto/generate-feedback.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback, FeedbackDocument } from './entities/feedback.entity';
import { extractGradeFromFeedback } from './utils/regex.util';

@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,

    @InjectModel(Feedback.name)
    private feedbackModel: Model<FeedbackDocument>,
  ) {}

  //Obtener el estado del feedback por nombre de repositorio
  @Get('status/:repo')
  async getFeedbackStatus(
    @Param('repo') repo: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!repo || typeof repo !== 'string' || repo.trim() === '') {
      throw new HttpException(
        'El parámetro "repo" es requerido y debe ser válido.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
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

  //Obtener la nota de la retroalimentación por nombre de repositorio
  @Get('gradeFeedback/:repo')
  async getFeedbackGrade(
    @Param('repo') repo: string,
    @Headers('authorization') authHeader: string,
  ) {
    const existRepo = await this.feedbackModel.findOne({ repo });
    if (!existRepo) {
      throw new HttpException(
        'No se encontró el nombre de este repositorio.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const feedback = await this.feedbackModel.findOne({ repo });

    //Retornar la nota de retroalimentación
    if (!feedback) {
      return {
        repo,
        gradeFeedback: 0,
        message: 'Este repositorio aún no tiene feedback generado.',
      };
    }

    return {
      repo,
      gradeFeedback: feedback.gradeFeedback,
      message: 'Nota de retroalimentación recuperada correctamente.',
    };
  }

  //Actualizar la nota de retroalimentación por id de tarea y correo
  @Patch('update/gradeFeedback')
  async updateFeedbackGrade(
    @Query('email') email: string,
    @Query('idTaskGithubClassroom') idTaskGithubClassroom: string,
    @Body('gradeFeedback') gradeFeedback: number,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!email || !idTaskGithubClassroom || !gradeFeedback) {
      throw new HttpException(
        'Los campos email, task y feedback son requeridos.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.feedbackModel.findOneAndUpdate(
      { email, idTaskGithubClassroom },
      { gradeFeedback },
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
      message: 'Nota de retroalimentación actualizada correctamente.',
      data: updated,
    };
  }

  //Generar feedback (MCP) dinámicamente con cualquier proveedor
  @Post('generate/:repo')
  async generateFeedback(
    @Param('repo') repo: string,
    @Body() body: Omit<GenerateFeedbackParams, 'repo'>,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const feedback = await this.feedbackService.generateFeedback({
        repo,
        ...body,
      });

      return {
        message: 'Feedback generado correctamente.',
        feedback,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
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
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!email || !idTaskGithubClassroom || !feedback) {
      throw new HttpException(
        'Los campos email, task y feedback son requeridos.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const gradeFeedback = extractGradeFromFeedback(feedback);

    const updated = await this.feedbackModel.findOneAndUpdate(
      { email, idTaskGithubClassroom },
      { feedback, gradeFeedback },
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
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

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
