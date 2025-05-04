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
  async getInvitationUrl(
    @Query('idTaskMoodle') idTaskMoodle: string,
    @Query('issuer') issuer: string,
  ) {
    if (!idTaskMoodle || !issuer) {
      throw new HttpException(
        'Los parámetros idTaskMoodle y issuer son requeridos.',
        HttpStatus.BAD_REQUEST,
      );
    }
  
    try {
      const url = await this.taskLinkService.getInvitationUrlByMoodleTask(idTaskMoodle, issuer);
      return { invitationUrl: url };
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }
  }
  