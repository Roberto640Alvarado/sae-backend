import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TaskLink, TaskLinkDocument } from './entities/TaskLink.entity';
import { User, UserDocument } from '../user/entities/user.entity';

@Injectable()
export class TaskLinkService {
  constructor(
    @InjectModel(TaskLink.name)
    private taskLinkModel: Model<TaskLinkDocument>,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async createLink(data: any): Promise<TaskLink> {
    const {
      idTaskGithubClassroom,
      idTaskMoodle,
      idCursoMoodle,
      orgId,
      orgName,
      emailOwner,
    } = data;

    //Verifica si ya existe una relación
    const exists = await this.taskLinkModel.findOne({
      idTaskGithubClassroom,
      idTaskMoodle,
      idCursoMoodle,
    });

    if (exists) {
      throw new HttpException(
        'Ya existe una relación con esos IDs.',
        HttpStatus.CONFLICT,
      );
    }

    //Verifica si el emailOwner pertenece a la organización especificada
    const user = await this.userModel.findOne({ email: emailOwner });

    if (!user) {
      throw new NotFoundException('No se encontró el usuario con ese correo.');
    }

    // Verificar si pertenece a la organización y si el nombre coincide exactamente
    const orgMatch = user.organizations?.find(
      (org) => org.orgId === orgId && org.orgName === orgName,
    );

    if (!orgMatch) {
      throw new HttpException(
        'El usuario no pertenece a la organización especificada o el nombre de la organización no coincide.',
        HttpStatus.FORBIDDEN,
      );
    }
    return this.taskLinkModel.create({ ...data, createdAt: new Date() });
  }

  async getInvitationUrlByMoodleTask(idTaskMoodle: string, issuer: string) {
    const link = await this.taskLinkModel.findOne({ idTaskMoodle, issuer });

    if (!link) {
      throw new NotFoundException(
        'No se encontró el enlace para esta tarea de Moodle en esa plataforma.',
      );
    }

    return link.url_Invitation;
  }
}
