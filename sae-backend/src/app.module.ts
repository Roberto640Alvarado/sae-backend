import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RepoModule } from './repo/repo.module';
import { FeedbackModule } from './feedback/feedback.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RepoModule,
    FeedbackModule,
  ],
})
export class AppModule {}
