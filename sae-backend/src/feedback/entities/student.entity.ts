import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StudentDocument = Student & Document;

@Schema()
export class Student {
  @Prop({ required: true, unique: true })
  login: string;

  @Prop({ required: true })
  email: string;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
