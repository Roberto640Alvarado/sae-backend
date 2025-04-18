import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ModelTypeDocument = ModelType & Document;

@Schema()
export class ModelType {
  @Prop({ required: true, enum: ['DeepSeek', 'Gemini', 'OpenAI'] })
  name: string;
}

export const ModelTypeSchema = SchemaFactory.createForClass(ModelType);