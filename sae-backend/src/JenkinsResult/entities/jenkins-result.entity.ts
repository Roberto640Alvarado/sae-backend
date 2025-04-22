import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type JenkinsResultDocument = JenkinsResult & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class JenkinsResult {
  @Prop({ required: true })
  repo: string;

  @Prop({ required: true, type: Number, min: 0, max: 100 })
  jenkinsScore: number;

  @Prop({ default: Date.now })
  executedAt: Date;
}

export const JenkinsResultSchema = SchemaFactory.createForClass(JenkinsResult);
