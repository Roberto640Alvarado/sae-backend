import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Feedback, FeedbackSchema } from './entities/feedback.entity';
import { Model as AIModel , ModelSchema} from '../model-type/entities/model.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
      { name: AIModel.name, schema: ModelSchema },

    ]),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService]
})
export class FeedbackModule {}
