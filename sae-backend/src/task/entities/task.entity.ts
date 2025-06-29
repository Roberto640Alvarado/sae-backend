import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TaskFeedbackStatusDocument = TaskFeedbackStatus & Document;

@Schema()
export class TaskFeedbackStatus {
  @Prop({ required: true, unique: true })
  idTaskGithubClassroom: string;

  @Prop({ type: Number, required: true, default: 0 })
  countEntregas: number;

  @Prop({ type: Number, required: true, default: 0 })
  countPendiente: number;

  @Prop({ type: Number, required: true, default: 0 })
  countGenerado: number;

  @Prop({ type: Number, required: true, default: 0 })
  countEnviado: number;
}

export const TaskFeedbackStatusSchema = SchemaFactory.createForClass(TaskFeedbackStatus);
