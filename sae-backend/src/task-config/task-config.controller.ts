import {
    Controller,
    Post,
    Get,
    Delete,
    Put,
    Body,
    Param,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { InjectModel } from '@nestjs/mongoose';
  import { Model } from 'mongoose';
  import { TaskConfig, TaskConfigDocument } from './entities/task-config.entities';
  
  @Controller('task-config')
  export class TaskConfigController {
    constructor(
      @InjectModel(TaskConfig.name)
      private readonly configModel: Model<TaskConfigDocument>,
    ) {}
  
    //Crear configuración de tarea
    @Post('create')
    async createConfig(@Body() body: Partial<TaskConfig>) {
      const { idTaskGithubClassroom } = body;
  
      const exists = await this.configModel.findOne({ idTaskGithubClassroom });
      if (exists) {
        throw new HttpException(
          'Ya existe una configuración para esta tarea.',
          HttpStatus.CONFLICT,
        );
      }
  
      const config = await this.configModel.create(body);
      return {
        message: 'Configuración creada exitosamente.',
        data: config,
      };
    }
  
    //Obtener configuración por ID de tarea de classroom
    @Get(':idTaskGithubClassroom')
    async getConfig(@Param('idTaskGithubClassroom') idTaskGithubClassroom: string) {
      const config = await this.configModel.findOne({ idTaskGithubClassroom });
  
      if (!config) {
        throw new HttpException(
          'No se encontró configuración para esta tarea.',
          HttpStatus.NOT_FOUND,
        );
      }
  
      return config;
    }
  
    //Editar configuración por ID de tarea classroom
    @Put(':idTaskGithubClassroom')
    async updateConfig(
      @Param('idTaskGithubClassroom') idTaskGithubClassroom: string,
      @Body() body: Partial<TaskConfig>,
    ) {
      const updated = await this.configModel.findOneAndUpdate(
        { idTaskGithubClassroom },
        body,
        { new: true },
      );
  
      if (!updated) {
        throw new HttpException(
          'No se pudo actualizar. Configuración no encontrada.',
          HttpStatus.NOT_FOUND,
        );
      }
  
      return {
        message: 'Configuración actualizada correctamente.',
        data: updated,
      };
    }
  
    //Eliminar configuración por ID de tarea de classroom
    @Delete(':idTaskGithubClassroom')
    async deleteConfig(@Param('idTaskGithubClassroom') idTaskGithubClassroom: string) {
      const deleted = await this.configModel.findOneAndDelete({ idTaskGithubClassroom });
  
      if (!deleted) {
        throw new HttpException(
          'No se encontró configuración para eliminar.',
          HttpStatus.NOT_FOUND,
        );
      }
  
      return {
        message: 'Configuración eliminada exitosamente.',
        data: deleted,
      };
    }
  }
  