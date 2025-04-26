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
    const { name, version, apiKey, modelType, orgId, ownerEmail } = body;

    if (!name || !version || !apiKey || !modelType) {
      throw new HttpException(
        'Los campos name, version, apiKey y modelType son requeridos.',
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

    //Validar que venga al menos orgId o ownerEmail
    if (!orgId && !ownerEmail) {
      throw new HttpException(
        'Debe proporcionar orgId (para modelos compartidos) o ownerEmail (para modelos personales).',
        HttpStatus.BAD_REQUEST,
      );
    }

    let isShared = true;

    //Validar existencia de la organización o el usuario, según el caso
    if (orgId) {
      const orgExists = await this.userModel.exists({
        'organizations.orgId': orgId,
      });

      if (!orgExists) {
        throw new HttpException(
          'El orgId especificado no existe en las organizaciones registradas.',
          HttpStatus.BAD_REQUEST,
        );
      }

      isShared = true;
    }

    if (ownerEmail) {
      const userExists = await this.userModel.findOne({ email: ownerEmail });
      if (!userExists) {
        throw new HttpException(
          'El usuario con ese email no está registrado.',
          HttpStatus.BAD_REQUEST,
        );
      }

      isShared = false;
    }

    //Crear modelo
    const model = await this.modelModel.create({
      name,
      version,
      apiKey,
      modelType,
      orgId: isShared ? orgId : undefined,
      ownerEmail: !isShared ? ownerEmail : undefined,
      isShared,
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

  //Obtener todos los modelos de una organización o de un usuario
  @Get('search')
  async getModelsByOwnerOrUser(
    @Query('orgId') orgId?: string,
    @Query('ownerEmail') ownerEmail?: string,
  ) {
    if (!orgId && !ownerEmail) {
      throw new HttpException(
        'Debes proporcionar orgId o ownerEmail como parámetro.',
        HttpStatus.BAD_REQUEST,
      );
    }

    let models: ModelDocument[] = [];
    if (orgId) {
      //Validar que el orgId exista
      const orgExists = await this.userModel.exists({
        'organizations.orgId': orgId,
      });

      if (!orgExists) {
        throw new HttpException(
          'El orgId especificado no existe en las organizaciones registradas.',
          HttpStatus.BAD_REQUEST,
        );
      }

      //Buscar modelos compartidos para esa organización
      models = await this.modelModel
        .find({ orgId })
        .populate('modelType', 'name')
        .lean();
    }

    if (ownerEmail) {
      //Validar que el usuario exista
      const userExists = await this.userModel.exists({ email: ownerEmail });

      if (!userExists) {
        throw new HttpException(
          'El ownerEmail especificado no existe en los usuarios registrados.',
          HttpStatus.BAD_REQUEST,
        );
      }

      //Buscar modelos personales para ese usuario
      const userModels = await this.modelModel
        .find({ ownerEmail })
        .populate('modelType', 'name')
        .lean();

      models = models.concat(userModels);
    }

    return {
      total: models.length,
      models,
    };
  }
}
