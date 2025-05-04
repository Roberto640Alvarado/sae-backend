import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskLink, TaskLinkSchema } from './entities/TaskLink.entity';
import { TaskLinkService } from './task-link.service';
import { TaskLinkController } from './task-link.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: TaskLink.name, schema: TaskLinkSchema }])],
  providers: [TaskLinkService],
  controllers: [TaskLinkController],
})
export class TaskLinkModule {}
