import {
  Controller,
  Post,
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
import { Student, StudentDocument } from './entities/student.entity';

@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,

    @InjectModel(Feedback.name)
    private feedbackModel: Model<FeedbackDocument>,

    @InjectModel(Student.name)
    private studentModel: Model<StudentDocument>,
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
        status: 'pending',
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
  @Post('deepseek')
  async generateWithDeepseek(@Body() body: GenerateFeedbackParams) {
    try {
      const feedback =
        await this.feedbackService.generateFeedbackWithDeepseek(body);
      return { message: 'Feedback generado con DeepSeek', feedback };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  //Generar feedback con OpenAI
  @Post('openai')
  async generateWithOpenAI(@Body() body: GenerateFeedbackParams) {
    try {
      const feedback =
        await this.feedbackService.generateFeedbackWithOpenAI(body);
      return { message: 'Feedback generado con OpenAI', feedback };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  //Generar feedback con Gemini
  @Post('gemini')
  async generateWithGemini(@Body() body: GenerateFeedbackParams) {
    try {
      const feedback =
        await this.feedbackService.generateFeedbackWithGemini(body);
      return { message: 'Feedback generado con Gemini', feedback };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  //Obtener feedback por email y tarea
  @Get('search')
  async getFeedbackByEmailAndTask(
    @Query('email') email: string,
    @Query('task') task: string,
  ) {
    if (!email || !task) {
      throw new HttpException(
        'Se requieren los parámetros email y task',
        HttpStatus.BAD_REQUEST,
      );
    }

    const feedbackData = await this.feedbackModel.findOne({ email, task });

    if (!feedbackData) {
      throw new HttpException(
        'No se encontró feedback para este estudiante en esta tarea',
        HttpStatus.NOT_FOUND,
      );
    }

    return feedbackData;
  }

  //Buscar estudiantes por login (username)
  @Get('students/:login/email')
  async getStudentEmailByLogin(@Param('login') login: string) {
    const student = await this.studentModel.findOne({ login });

    if (!student) {
      throw new HttpException('Estudiante no encontrado', HttpStatus.NOT_FOUND);
    }

    return { email: student.email };
  }
}
