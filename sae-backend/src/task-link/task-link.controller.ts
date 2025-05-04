import {
    Controller,
    Post,
    Body,
    Query,
    HttpException,
    HttpStatus,
    Get,
  } from '@nestjs/common';
  import { TaskLinkService } from './task-link.service';
  import { TaskLink } from './entities/TaskLink.entity';
  
  @Controller('task-link')
  export class TaskLinkController {
    constructor(private readonly taskLinkService: TaskLinkService) {}
  
    @Post('create')
  async create(@Body() body: any) {
    const created = await this.taskLinkService.createLink(body);
    return {
      message: 'Enlace creado correctamente.',
      data: created,
    };
  }
  
    @Get('invitation-url')
    async getInvitationUrl(@Query('idTaskMoodle') idTaskMoodle: string) {
      if (!idTaskMoodle) {
        throw new HttpException(
          'El parámetro idTaskMoodle es requerido.',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      try {
        const url = await this.taskLinkService.getInvitationUrlByMoodleTask(idTaskMoodle);
        return { invitationUrl: url };
      } catch (error) {
        throw new HttpException(error.message, error.status || 500);
      }
    }
  }
  