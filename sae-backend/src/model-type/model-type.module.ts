import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModelType, ModelTypeSchema } from './entities/model-type.entity';
import { Model, ModelSchema } from './entities/model.entity';
import { User, UserSchema } from '../user/entities/user.entity';
import { ModelTypeController } from './model-type.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ModelType.name, schema: ModelTypeSchema },
      { name: Model.name, schema: ModelSchema }, 
      { name: User.name, schema: UserSchema },

    ]),
  ],
  controllers: [ModelTypeController],
})
export class ModelTypeModule {}
