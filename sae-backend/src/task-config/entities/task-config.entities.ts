import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TaskConfigDocument = TaskConfig & Document;

@Schema({ timestamps: true })
export class TaskConfig {
  @Prop({ required: true })
  language: string;

  @Prop({ required: true })
  extension: string;

  @Prop({ required: true })
  studentLevel: string;

  @Prop({ required: true })
  style: string;

  @Prop({ required: true })
  topic: string;

  @Prop({ required: true })
  constraints: string;

  @Prop({ required: true })
  modelIA: string;

  @Prop({ type: String, required: false })
  providerNameIA?: string;

  @Prop({ required: true, unique: true })
  idTaskGithubClassroom: string;
}

export const TaskConfigSchema = SchemaFactory.createForClass(TaskConfig);
