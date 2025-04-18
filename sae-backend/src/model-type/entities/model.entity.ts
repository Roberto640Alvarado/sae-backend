import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ModelDocument = Model & Document;

@Schema({ timestamps: true })
export class Model {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  version: string;

  @Prop({ required: true })
  apiKey: string; 

  @Prop({ type: Types.ObjectId, ref: 'ModelType', required: true })
  modelType: Types.ObjectId;

  @Prop({ required: true })
  owner: string; 
}

export const ModelSchema = SchemaFactory.createForClass(Model);
