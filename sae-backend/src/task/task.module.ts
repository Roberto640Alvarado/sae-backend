import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

import { TaskFeedbackStatus, TaskFeedbackStatusSchema } from './entities/task.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TaskFeedbackStatus.name, schema: TaskFeedbackStatusSchema },
    ]),
  ],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [MongooseModule],
})
export class TaskModule {}
