import {
  Controller,
  Post,
  Get,
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
import { Teacher, TeacherDocument } from '../teacher/entities/teacher.entity';

@Controller('model-types')
export class ModelTypeController {
  constructor(
    @InjectModel(ModelType.name)
    private readonly modelTypeModel: Model<ModelTypeDocument>,

    @InjectModel(ModelEntity.name)
    private readonly modelModel: Model<ModelDocument>,

    @InjectModel(Teacher.name)
    private readonly teacherModel: Model<TeacherDocument>,
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
  async createModel(@Body() body: Partial<ModelEntity>) {
    const { name, version, apiKey, modelType, owner } = body;

    if (!name || !version || !apiKey || !modelType || !owner) {
      throw new HttpException(
        'Todos los campos son requeridos.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Validar que el tipo de modelo exista
    const modelTypeExists = await this.modelTypeModel.findById(modelType);
    if (!modelTypeExists) {
      throw new HttpException(
        'El tipo de modelo especificado no existe.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Validar que el owner (correo) exista en la colección teachers
    const ownerExists = await this.teacherModel.findOne({ email: owner });
    if (!ownerExists) {
      throw new HttpException(
        'El catedrático (owner) no está registrado.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Crear el modelo si todo es válido
    const model = await this.modelModel.create({
      name,
      version,
      apiKey,
      modelType,
      owner,
    });

    return {
      message: 'Modelo creado exitosamente.',
      data: model,
    };
  }

  //Eliminar modelo por ID
  @Delete('delete/:id')
  async deleteModel(@Param('id') id: string) {
    const deleted = await this.modelModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new HttpException('Modelo no encontrado.', HttpStatus.NOT_FOUND);
    }

    return { message: 'Modelo eliminado correctamente.', id };
  }

  //Obtener todos los modelos de un owner (por email)
  @Get('search')
  async getModelsByOwner(@Query('owner') owner: string) {
    if (!owner) {
      throw new HttpException(
        'El campo "owner" es requerido.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const ownerExists = await this.teacherModel.findOne({ email: owner });
    if (!ownerExists) {
      throw new HttpException(
        'El catedrático (owner) no está registrado.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const models = await this.modelModel
      .find({ owner })
      .populate('modelType', 'name')
      .lean();

    return {
      total: models.length,
      models,
    };
  }
}
