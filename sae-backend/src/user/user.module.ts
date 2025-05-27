import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from './entities/user.entity';
import { ModelType, ModelTypeSchema } from 'src/model-type/entities/model-type.entity';
import { Model , ModelSchema} from 'src/model-type/entities/model.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ModelType.name, schema: ModelTypeSchema },
      { name: Model.name, schema: ModelSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
