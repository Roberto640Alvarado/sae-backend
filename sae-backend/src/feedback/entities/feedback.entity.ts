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

  @Prop({ required: true, type: Number, min: 0 })
  gradeValue: number;

  @Prop({ required: true, type: Number, min: 1 })
  gradeTotal: number;

  @Prop({
    required: true,
    enum: ['pending', 'generated', 'sent'],
    default: 'pending',
  })
  status: 'pending' | 'generated' | 'sent';

  @Prop()
  modelIA?: string;

  @Prop()
  createdAt?: Date;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
