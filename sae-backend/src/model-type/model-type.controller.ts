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
import { User, UserDocument } from '../user/entities/user.entity';

@Controller('model-types')
export class ModelTypeController {
  constructor(
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
  async createModel(@Body() body: Partial<ModelEntity>) {
    const { name, version, apiKey, modelType, orgId } = body;

    if (!name || !version || !apiKey || !modelType || !orgId) {
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

    //Validar que el orgId exista en alguna organización de usuarios
    const orgExists = await this.userModel.exists({
      'organizations.orgId': orgId,
    });
    if (!orgExists) {
      throw new HttpException(
        'El orgId especificado no existe en las organizaciones registradas.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Crear el modelo si todo es válido
    const model = await this.modelModel.create({
      name,
      version,
      apiKey,
      modelType,
      orgId,
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

  //Obtener todos los modelos de un organización
  @Get('search')
  async getModelsByOwner(@Query('orgId') orgId: string) {
    if (!orgId) {
      throw new HttpException(
        'El campo "orgId" es requerido.',
        HttpStatus.BAD_REQUEST,
      );
    }

    //Validar que el orgId exista en alguna organización de usuarios
    const orgExists = await this.userModel.exists({
      'organizations.orgId': orgId,
    });
    if (!orgExists) {
      throw new HttpException(
        'El orgId especificado no existe en las organizaciones registradas.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const models = await this.modelModel
      .find({ orgId })
      .populate('modelType', 'name')
      .lean();

    return {
      total: models.length,
      models,
    };
  }
}
