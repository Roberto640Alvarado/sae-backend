import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Feedback, FeedbackSchema } from './entities/feedback.entity';
import { Model as AIModel , ModelSchema} from '../model-type/entities/model.entity';
import { ModelType, ModelTypeSchema } from '../model-type/entities/model-type.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
      { name: ModelType.name, schema: ModelTypeSchema },
      { name: AIModel.name, schema: ModelSchema },

    ]),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService]
})
export class FeedbackModule {}
