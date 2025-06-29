import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TaskFeedbackStatus,
  TaskFeedbackStatusDocument,
} from './entities/task.entity';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectModel(TaskFeedbackStatus.name)
    private readonly taskFeedbackStatusModel: Model<TaskFeedbackStatusDocument>,
  ) {}

  async upsertFeedbackStatus(data: {
    idTaskGithubClassroom: string;
    countEntregas: number;
    countPendiente: number;
    countGenerado: number;
    countEnviado: number;
  }): Promise<TaskFeedbackStatus> {
    try {
      const { idTaskGithubClassroom, ...rest } = data;

      const existing = await this.taskFeedbackStatusModel.findOne({
        idTaskGithubClassroom,
      });

      if (existing) {
        this.logger.log(`Actualizando estado para ${idTaskGithubClassroom}`);
        const updated = await this.taskFeedbackStatusModel.findOneAndUpdate(
          { idTaskGithubClassroom },
          { $set: rest },
          { new: true },
        );

        if (!updated) {
          throw new HttpException(
            'No se pudo actualizar el estado de retroalimentación.',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        return updated;
      }

      this.logger.log(`Creando nuevo estado para ${idTaskGithubClassroom}`);
      const newRecord = new this.taskFeedbackStatusModel(data);
      return await newRecord.save();
    } catch (error) {
      this.logger.error('Error al crear o actualizar el estado de feedback', error);
      throw new HttpException(
        'Error al procesar el estado de feedback',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
