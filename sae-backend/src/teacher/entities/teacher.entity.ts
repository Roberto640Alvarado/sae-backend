import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TeacherDocument = Teacher & Document;

@Schema()
export class Teacher {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({
    required: true,
    enum: ['teacher', 'admin'],
    default: 'teacher',
  })
  role: 'teacher' | 'admin';
}

export const TeacherSchema = SchemaFactory.createForClass(Teacher);