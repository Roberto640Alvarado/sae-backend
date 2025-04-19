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
      const { taskIdClassroom } = body;
  
      const exists = await this.configModel.findOne({ taskIdClassroom });
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
    @Get(':taskIdClassroom')
    async getConfig(@Param('taskIdClassroom') taskIdClassroom: string) {
      const config = await this.configModel.findOne({ taskIdClassroom });
  
      if (!config) {
        throw new HttpException(
          'No se encontró configuración para esta tarea.',
          HttpStatus.NOT_FOUND,
        );
      }
  
      return config;
    }
  
    //Editar configuración por ID de tarea classroom
    @Put(':taskIdClassroom')
    async updateConfig(
      @Param('taskIdClassroom') taskIdClassroom: string,
      @Body() body: Partial<TaskConfig>,
    ) {
      const updated = await this.configModel.findOneAndUpdate(
        { taskIdClassroom },
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
    @Delete(':taskIdClassroom')
    async deleteConfig(@Param('taskIdClassroom') taskIdClassroom: string) {
      const deleted = await this.configModel.findOneAndDelete({ taskIdClassroom });
  
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
  