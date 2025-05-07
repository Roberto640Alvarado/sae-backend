import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TaskLinkDocument = TaskLink & Document;

@Schema({ timestamps: true })
export class TaskLink {
  @Prop({ required: true }) 
  idTaskGithubClassroom: string;

  @Prop({ required: true }) 
  idClassroom: string;

  @Prop({ required: true }) 
  orgId: string;

  @Prop({ required: true })
  orgName: string;

  @Prop({ required: true }) 
  url_Invitation: string;

  @Prop({ required: true }) 
  emailOwner: string;

  @Prop({ required: true }) 
  idTaskMoodle: string;

  @Prop({ required: true }) 
  idCursoMoodle: string;

  @Prop({ required: true })
  issuer: string;
}

export const TaskLinkSchema = SchemaFactory.createForClass(TaskLink);
