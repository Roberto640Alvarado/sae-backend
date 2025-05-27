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
  Headers,
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
  async getAllModelTypes(@Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

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
  async createModel(
    @Headers('authorization') authHeader: string,
    @Body() body: any,
  ) {
    try {
      if (!authHeader) {
        throw new HttpException(
          'Token no proporcionado en el header Authorization.',
          HttpStatus.UNAUTHORIZED,
        );
      }

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
  async deleteModel(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    try {
      if (!authHeader) {
        throw new HttpException(
          'Token no proporcionado en el header Authorization.',
          HttpStatus.UNAUTHORIZED,
        );
      }

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
    @Headers('authorization') authHeader: string,
    @Query('modelId') modelId: string,
    @Query('email') email: string,
    @Query('orgId') orgId: string,
  ) {
    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

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

  //Eliminar un Teacher del modelo
  @Patch('remove-teacher')
  async removeTeacherFromModel(
    @Headers('authorization') authHeader: string,
    @Query('modelId') modelId: string,
    @Query('email') email: string,
    @Query('orgId') orgId: string,
  ) {
    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!modelId || !email || !orgId) {
      throw new HttpException(
        'Se requieren modelId, email y orgId.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const updatedModel = await this.modelService.removeTeacherFromModel(
        modelId,
        email,
        orgId,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Teacher eliminado exitosamente del modelo.',
        data: updatedModel,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al eliminar el Teacher del modelo.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  //Obtener todos los modelos que puede usar un Teacher
  @Get('models-for-teacher')
  async getModelsForTeacher(
    @Headers('authorization') authHeader: string,
    @Query('email') email: string,
    @Query('orgId') orgId: string,
  ) {
    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!email) {
      throw new HttpException(
        'Se requiere el parámetro email.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!orgId) {
      throw new HttpException(
        'Se requiere el parámetro orgId.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const models = await this.modelService.getModelsForTeacher(email, orgId);

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

  //Obtener los modelos de una organización
  @Get('org-models')
  async getModelsByOrg(
    @Headers('authorization') authHeader: string,
    @Query('orgId') orgId: string,
  ) {
    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!orgId) {
      throw new HttpException(
        'El campo "orgId" es requerido.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const models = await this.modelService.findModelsByOrgId(orgId);

    if (!models.length) {
      throw new HttpException(
        'No se encontraron modelos para esta organización.',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Modelos obtenidos correctamente.',
      total: models.length,
      models,
    };
  }

  //Obtener todos los proveedores (_id y name)
  @Get('providers')
  async getAllProviders(@Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const providers = await this.modelService.getAllProviders();

    if (!providers.length) {
      throw new HttpException(
        'No hay proveedores registrados.',
        HttpStatus.NOT_FOUND,
      );
    }

    return { total: providers.length, providers };
  }

  //Agregar un modelo a un proveedor
  @Post('providers/:id/add-model')
  async addModelToProvider(
    @Headers('authorization') authHeader: string,
    @Param('id') providerId: string,
    @Body('modelName') modelName: string,
  ) {
    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const updated = await this.modelService.addModelToProvider(
        providerId,
        modelName,
      );
      return {
        message: `Modelo "${modelName}" agregado correctamente al proveedor.`,
        data: updated,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //Eliminar un modelo de un proveedor
  @Delete('providers/:id/remove-model')
  async removeModelFromProvider(
    @Headers('authorization') authHeader: string,
    @Param('id') providerId: string,
    @Body('modelName') modelName: string,
  ) {
    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const updated = await this.modelService.removeModelFromProvider(
        providerId,
        modelName,
      );
      return {
        message: `Modelo "${modelName}" eliminado correctamente del proveedor.`,
        data: updated,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  //Obtener todos los modelos de un proveedor por su ID
  @Get('providers/:id/models')
  async getModelsByProviderId(
    @Headers('authorization') authHeader: string,
    @Param('id') providerId: string,
  ) {
    if (!authHeader) {
      throw new HttpException(
        'Token no proporcionado en el header Authorization.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const models = await this.modelService.getModelsByProviderId(providerId);
      return {
        total: models.length,
        models,
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
  }
}
