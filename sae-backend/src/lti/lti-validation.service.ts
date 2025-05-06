import mongoose, { Model } from 'mongoose';
import {
  TaskLink,
  TaskLinkSchema,
} from '../task-link/entities/TaskLink.entity';
import { Feedback, FeedbackSchema } from '../feedback/entities/feedback.entity';
import { User, UserSchema } from '../user/entities/user.entity';

let isConnected = false;

export class LtiValidationService {
  private taskLinkModel: Model<TaskLink>;
  private feedbackModel: Model<Feedback>;
  private userModel: Model<User>;

  constructor() {
    if (!isConnected) {
      mongoose.connect(process.env.MONGO_URI!).then(() => {
        console.log('✅ Conectado a MongoDB desde LtiValidationService');
        isConnected = true;
      });
    }
    this.taskLinkModel = mongoose.model<TaskLink>('TaskLink', TaskLinkSchema);
    this.feedbackModel = mongoose.model<Feedback>('Feedback', FeedbackSchema);
    this.userModel = mongoose.model<User>('User', UserSchema);
  }

  //Verifica si existe feedback basado en email + idTaskMoodle + issuer
  async hasFeedback(
    email: string,
    idTaskMoodle: string,
    issuer: string,
  ): Promise<boolean> {
    const taskLink = await this.taskLinkModel.findOne({
      idTaskMoodle,
      issuer,
    });

    if (!taskLink) return false;

    const idTaskGithub = taskLink.idTaskGithubClassroom;

    const feedback = await this.feedbackModel.findOne({
      email,
      idTaskGithubClassroom: idTaskGithub,
    });

    return !!feedback; //true si existe, false si no
  }

  //Devolver informacion de id de tarea de github basado en email + idTaskMoodle + issuer
  async getIdTaskGithubByFeedback(
    email: string,
    idTaskMoodle: string,
    issuer: string,
  ): Promise<string> {
    const taskLink = await this.taskLinkModel.findOne({
      idTaskMoodle,
      issuer,
    });

    if (!taskLink) {
      throw new Error('No se encontró el enlace para esta tarea de Moodle.');
    }

    const idTaskGithub = taskLink.idTaskGithubClassroom;

    const feedback = await this.feedbackModel.findOne({
      email,
      idTaskGithubClassroom: idTaskGithub,
    });

    if (!feedback) {
      throw new Error('No se encontró el feedback para este usuario.');
    }

    return feedback.idTaskGithubClassroom; //Devuelve la tarea enlazada
  }

  //Verifica si existe un usuario basado en el email
  async hasUser(email: string): Promise<boolean> {
    const user = await this.userModel.findOne({
      email,
    });
    return !!user; //true si existe, false si no
  }

  //Verificar si una tarea de moodle ya fue enlazada a una tarea de github
  async hasTaskLink(idTaskMoodle: string, issuer: string): Promise<boolean> {
    const taskLink = await this.taskLinkModel.findOne({
      idTaskMoodle,
      issuer,
    });
    return !!taskLink; //true si existe, false si no
  }

  //Devolver url de invitación de una tarea de moodle
  async getInvitationUrlByMoodleTask(
    idTaskMoodle: string,
    issuer: string,
  ): Promise<string> {
    const taskLink = await this.taskLinkModel.findOne({
      idTaskMoodle,
      issuer,
    });

    if (!taskLink) {
      throw new Error('No se encontró el enlace para esta tarea de Moodle.');
    }

    return taskLink.url_Invitation;
  }

  //Devolver información de una tarea de moodle enlazada a una tarea de github
  async getTaskLinkByMoodleTask(
    idTaskMoodle: string,
    issuer: string,
  ): Promise<TaskLink | null> {
    const taskLink = await this.taskLinkModel.findOne({
      idTaskMoodle,
      issuer,
    });

    if (!taskLink) {
      throw new Error('No se encontró el enlace para esta tarea de Moodle.');
    }

    return taskLink; // Devuelve la tarea enlazada
  }
}
