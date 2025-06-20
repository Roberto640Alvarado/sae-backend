import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: String, default: null })
  name: string | null;

  @Prop({ type: String, default: null })
  githubUsername: string | null;

  @Prop({ type: String, default: null })
  urlAvatar: string | null;

  @Prop({ default: false })
  isRoot: boolean;

  @Prop([
    {
      orgId: { type: String, required: true },
      orgName: String,
      role: {
        type: String,
        enum: ['Student', 'Teacher', 'ORG_Admin'],
        required: true,
      },
      isActive: { type: Boolean, default: true },
    },
  ])
  organizations: {
    orgId: string;
    orgName: string;
    role: 'Student' | 'Teacher' | 'ORG_Admin';
    isActive?: boolean;
  }[];
}

export const UserSchema = SchemaFactory.createForClass(User);
