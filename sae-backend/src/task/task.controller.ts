import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TaskService } from './task.service';

@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('feedback-status')
  async upsertTaskFeedbackStatus(
    @Body()
    body: {
      idTaskGithubClassroom: string;
      countEntregas: number;
      countPendiente: number;
      countGenerado: number;
      countEnviado: number;
    },
  ) {
    const { idTaskGithubClassroom, countEntregas, countPendiente, countGenerado, countEnviado } = body;

    if (!idTaskGithubClassroom) {
      throw new HttpException(
        'idTaskGithubClassroom es requerido.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.taskService.upsertFeedbackStatus({
      idTaskGithubClassroom,
      countEntregas,
      countPendiente,
      countGenerado,
      countEnviado,
    });
  }
}
