import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TaskLink, TaskLinkDocument } from './entities/TaskLink.entity';

@Injectable()
export class TaskLinkService {
  constructor(
    @InjectModel(TaskLink.name)
    private taskLinkModel: Model<TaskLinkDocument>,
  ) {}

  async createLink(data: any): Promise<TaskLink> {
    const exists = await this.taskLinkModel.findOne({
      idTaskGithubClassroom: data.idTaskGithubClassroom,
      idTaskMoodle: data.idTaskMoodle,
      idCursoMoodle: data.idCursoMoodle,
    });

    if (exists) {
      throw new HttpException(
        'Ya existe una relación con esos IDs.',
        HttpStatus.CONFLICT,
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
