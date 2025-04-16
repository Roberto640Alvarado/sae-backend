import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FeedbackDocument = Feedback & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Feedback {
  @Prop({ required: true })
  repo: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  task: string;

  @Prop({ required: true })
  feedback: string;

  @Prop({ required: true })
  grade: string;

  @Prop()
  createdAt?: Date;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
