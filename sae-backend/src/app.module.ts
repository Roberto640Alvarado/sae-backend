import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RepoModule } from './repo/repo.module';
import { FeedbackModule } from './feedback/feedback.module';
import { MongooseModule } from '@nestjs/mongoose';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI', { infer: true }),
      }),
      inject: [ConfigService],
    }),
    RepoModule,
    FeedbackModule,
  ],
})
export class AppModule {}
