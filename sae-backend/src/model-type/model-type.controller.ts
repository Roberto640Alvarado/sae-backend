import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ModelType, ModelTypeDocument } from './entities/model-type.entity';
import { Model as ModelEntity, ModelDocument } from './entities/model.entity';
import { User, UserDocument } from '../user/entities/user.entity';
import { ModelService } from './model-type.service';

@Controller('model-types')
export class ModelTypeController {
  constructor(
    private readonly modelService: ModelService,

    @InjectModel(ModelType.name)
    private readonly modelTypeModel: Model<ModelTypeDocument>,

    @InjectModel(ModelEntity.name)
    private readonly modelModel: Model<ModelDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  //Traer todos los tipos de modelo (proveedores)
  @Get('all')
  async getAllModelTypes() {
    const modelTypes = await this.modelTypeModel.find();

    if (!modelTypes.length) {
      throw new HttpException(
        'No hay tipos de modelo registrados.',
        HttpStatus.NOT_FOUND,
      );
    }
    return { total: modelTypes.length, modelTypes };
  }

  //Crear un modelo de IA
  @Post('create')
  async createModel(@Body() body: any) {
    try {
      const createdModel = await this.modelService.createModel(body);

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Modelo creado exitosamente.',
        data: createdModel,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error creando el modelo.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //Eliminar un modelo de IA
  @Delete('delete/:id')
  async deleteModel(@Param('id') id: string) {
    try {
      const deletedModel = await this.modelService.deleteModel(id);

      return {
        statusCode: HttpStatus.OK,
        message: 'Modelo eliminado exitosamente.',
        data: deletedModel,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error eliminando el modelo.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //Agregar un Teacher al modelo
  @Patch('add-teacher')
  async addTeacherToModel(
    @Query('modelId') modelId: string,
    @Query('email') email: string,
    @Query('orgId') orgId: string,
  ) {
    if (!modelId || !email || !orgId) {
      throw new HttpException(
        'Se requieren modelId, email y orgId.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const updatedModel = await this.modelService.addTeacherToModel(
        modelId,
        email,
        orgId,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Teacher agregado exitosamente al modelo.',
        data: updatedModel,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al agregar el Teacher al modelo.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //Obtener todos los modelos que puede usar un Teacher
@Get('models-for-teacher')
async getModelsForTeacher(@Query('email') email: string) {
  if (!email) {
    throw new HttpException(
      'Se requiere el parámetro email.',
      HttpStatus.BAD_REQUEST,
    );
  }

  try {
    const models = await this.modelService.getModelsForTeacher(email);

    return {
      statusCode: HttpStatus.OK,
      total: models.length,
      models,
    };
  } catch (error) {
    throw new HttpException(
      error.message || 'Error al obtener los modelos para el Teacher.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

}
