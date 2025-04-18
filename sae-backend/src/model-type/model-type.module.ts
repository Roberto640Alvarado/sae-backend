import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModelType, ModelTypeSchema } from './entities/model-type.entity';
import { Model, ModelSchema } from './entities/model.entity';
import { Teacher, TeacherSchema } from '../teacher/entities/teacher.entity';
import { ModelTypeController } from './model-type.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ModelType.name, schema: ModelTypeSchema },
      { name: Model.name, schema: ModelSchema }, 
      { name: Teacher.name, schema: TeacherSchema },

    ]),
  ],
  controllers: [ModelTypeController],
})
export class ModelTypeModule {}
