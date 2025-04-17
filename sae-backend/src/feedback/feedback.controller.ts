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
  //Generar feedback con Gemini
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
  @Get('by-email-task')
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
  @Get('student-email/:login')
  async getStudentEmailByLogin(@Param('login') login: string) {
    const student = await this.studentModel.findOne({ login });

    if (!student) {
      throw new HttpException('Estudiante no encontrado', HttpStatus.NOT_FOUND);
    }

    return { email: student.email };
  }
}
