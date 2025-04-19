import { Module } from '@nestjs/common';
import { TaskConfigController } from './task-config.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskConfig, TaskConfigSchema } from '../task-config/entities/task-config.entities';

@Module({
  imports: [
      MongooseModule.forFeature([
        { name: TaskConfig.name, schema: TaskConfigSchema },
      ]),
    ],
  controllers: [TaskConfigController],
})
export class TaskConfigModule {}