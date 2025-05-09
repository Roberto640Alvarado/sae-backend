import {
  Controller,
  Post,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Get,
  Headers,
} from '@nestjs/common';
import { TaskLinkService } from './task-link.service';

@Controller('task-link')
export class TaskLinkController {
  constructor(private readonly taskLinkService: TaskLinkService) {}

  //Crear enlace de tarea de github y moodle
  @Post('create')
  async create(
    @Headers('authorization') authHeader: string,
    @Body() body: any) {

    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const created = await this.taskLinkService.createLink(body);
    return {
      message: 'Enlace creado correctamente.',
      data: created,
    };
  }

  //Obtener todas las tareas enlazadas de moodle de una classroom
  @Get('github-tasks')
  async getGithubTasksByClassroom(
    @Query('idClassroom') idClassroom: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!idClassroom) {
      throw new HttpException(
        'El parámetro idClassroom es requerido.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const tasks =
        await this.taskLinkService.getLinkedGithubTasksByClassroom(idClassroom);
      return {
        message: 'Tareas enlazadas obtenidas correctamente.',
        data: tasks,
      };
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }

}
