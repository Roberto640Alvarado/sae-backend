import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    HttpStatus,
    HttpException,
  } from '@nestjs/common';
  import { InjectModel } from '@nestjs/mongoose';
  import { Model } from 'mongoose';
  import { JenkinsResult, JenkinsResultDocument } from './entities/jenkins-result.entity';
  
  @Controller('jenkins-results')
  export class JenkinsResultController {
    constructor(
      @InjectModel(JenkinsResult.name)
      private readonly jenkinsModel: Model<JenkinsResultDocument>,
    ) {}
  
    //Guardar resultado de Jenkins
    @Post('create')
    async createResult(
      @Body('repo') repo: string,
      @Body('jenkinsScore') jenkinsScore: number,
    ) {
      if (!repo || jenkinsScore == null) {
        throw new HttpException('Campos repo y jenkinsScore requeridos.', HttpStatus.BAD_REQUEST);
      }
  
      const result = await this.jenkinsModel.create({ repo, jenkinsScore });
      return {
        message: 'Resultado de Jenkins guardado correctamente.',
        data: result,
      };
    }
  
    //Obtener resultado por nombre de repositorio
    @Get(':repo')
    async getResultByRepo(@Param('repo') repo: string) {
      const result = await this.jenkinsModel.findOne({ repo });
  
      if (!result) {
        throw new HttpException(
          `No se encontró resultado para el repositorio "${repo}"`,
          HttpStatus.NOT_FOUND,
        );
      }
  
      return result;
    }
  }
  