import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ModelDocument } from './entities/model.entity';
import { ModelType, ModelTypeDocument } from './entities/model-type.entity';
import { User, UserDocument } from '../user/entities/user.entity';
import { Model as MongooseModel } from 'mongoose';

@Injectable()
export class ModelService {
  constructor(
    @InjectModel(Model.name)
    private readonly modelModel: MongooseModel<ModelDocument>,

    @InjectModel(ModelType.name)
    private readonly modelTypeModel: MongooseModel<ModelTypeDocument>,

    @InjectModel(User.name)
    private readonly userModel: MongooseModel<UserDocument>,
  ) {}

  //Crear un modelo de IA
  async createModel(data: {
    name: string;
    version: string;
    apiKey: string;
    modelType: string;
    ownerEmail?: string;
    orgId?: string;
  }) {
    const { name, version, apiKey, modelType, ownerEmail, orgId } = data;

    //Validar campos obligatorios
    if (!name || !version || !apiKey || !modelType) {
      throw new Error('Todos los campos principales son requeridos.');
    }

    //Validar que el tipo de modelo exista
    const typeExists = await this.modelTypeModel.findById(modelType);
    if (!typeExists) {
      throw new Error('El tipo de modelo especificado no existe.');
    }

    if (ownerEmail && orgId) {
      throw new Error('No puedes definir ownerEmail y orgId al mismo tiempo.');
    }

    if (!ownerEmail && !orgId) {
      throw new Error(
        'Debes definir un ownerEmail (personal) o un orgId (organizacional).',
      );
    }

    //Validar existencia de ownerEmail o de orgId
    if (ownerEmail) {
      const userExists = await this.userModel.exists({ email: ownerEmail });
      if (!userExists) {
        throw new Error('El correo del dueño especificado no existe.');
      }
    }

    if (orgId) {
      const orgExists = await this.userModel.exists({
        'organizations.orgId': orgId,
      });
      if (!orgExists) {
        throw new Error('El orgId especificado no existe.');
      }
    }

    const createdModel = await this.modelModel.create({
      name,
      version,
      apiKey,
      modelType,
      ownerEmail: ownerEmail || undefined,
      orgId: orgId || undefined,
      allowedTeachers: [],
    });

    return createdModel;
  }

  //Eliminar modelo por ID
  async deleteModel(modelId: string) {
    const deleted = await this.modelModel.findByIdAndDelete(modelId);

    if (!deleted) {
      throw new Error('No se encontró el modelo para eliminar.');
    }

    return deleted;
  }

  //Agregar un profesor a un modelo
  async addTeacherToModel(modelId: string, email: string, orgId: string) {
    //Verificar que el modelo exista
    const model = await this.modelModel.findById(modelId);
    if (!model) {
      throw new Error('El modelo especificado no existe.');
    }

    //Verificar si es un modelo personal
    if (model.ownerEmail) {
      throw new Error(
        'Este modelo es de acceso personal, no puede asignar profesores.',
      );
    }

    //Verificar que el usuario exista y sea Teacher en esa organización
    const user = await this.userModel.findOne({
      email,
      organizations: {
        $elemMatch: { orgId, role: 'Teacher' },
      },
    });

    if (!user) {
      throw new Error(
        'El usuario no existe o no tiene rol de Teacher en la organización.',
      );
    }

    //Agregar el email si no está repetido
    if (!model.allowedTeachers.includes(email)) {
      model.allowedTeachers.push(email);
      await model.save();
    } else {
      throw new Error('El usuario ya tiene acceso al modelo.');
    }

    return model;
  }

  async getModelsForTeacher(email: string): Promise<any[]> {
    //Traer modelos personales (por ownerEmail)
    const personalModels = await this.modelModel
      .find({ ownerEmail: email })
      .populate('modelType', 'name')
      .lean();

    //Traer modelos organizacionales donde esté en allowedEmails
    const organizationalModels = await this.modelModel
      .find({ allowedTeachers: email })
      .populate('modelType', 'name')
      .lean();

    //Añadir un campo para indicar el tipo de modelo
    const labeledPersonalModels = personalModels.map((model) => ({
      ...model,
      accessType: 'Personal',
    }));

    const labeledOrganizationalModels = organizationalModels.map((model) => ({
      ...model,
      accessType: 'Organizacional',
    }));

    //Combinar ambos resultados
    return [...labeledPersonalModels, ...labeledOrganizationalModels];
  }

  //Filtrar modelos que tengan este orgId
  async findModelsByOrgId(orgId: string) {
    const models = await this.modelModel
      .find({ orgId }) 
      .populate('modelType', 'name') 
      .lean();

    return models;
  }

  //Eliminar un profesor de un modelo
  async removeTeacherFromModel(modelId: string, email: string, orgId: string) {
    const model = await this.modelModel.findOne({ _id: modelId, orgId });
  
    if (!model) {
      throw new Error('Modelo no encontrado para la organización especificada.');
    }
  
    if (!model.allowedTeachers.includes(email)) {
      throw new Error('El teacher no está asignado a este modelo.');
    }
  
    //Remover el email del array
    model.allowedTeachers = model.allowedTeachers.filter(e => e !== email);
    return model.save();
  }

  //Obtener la key de API por ID de modelo
  async getApiKeyByModelId(modelId: string): Promise<string> {
    const model = await this.modelModel.findById(modelId).select('apiKey');
    if (!model) {
      throw new Error('Modelo no encontrado');
    }
    return model.apiKey;
  }
  
  
}
