import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskLink, TaskLinkSchema } from './entities/TaskLink.entity';
import { User, UserSchema } from '../user/entities/user.entity';
import { TaskLinkService } from './task-link.service';
import { TaskLinkController } from './task-link.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TaskLink.name, schema: TaskLinkSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [TaskLinkService],
  controllers: [TaskLinkController],
})
export class TaskLinkModule {}
