import { Module } from '@nestjs/common';
import { RepoController } from './repo.controller';
import { RepoService } from './repo.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Feedback, FeedbackSchema } from '../feedback/entities/feedback.entity';

@Module({
  imports: [
      MongooseModule.forFeature([
        { name: Feedback.name, schema: FeedbackSchema },
      ]),
    ],
  controllers: [RepoController],
  providers: [RepoService]
})
export class RepoModule {}
