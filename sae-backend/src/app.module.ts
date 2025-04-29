import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RepoModule } from './repo/repo.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ModelTypeModule } from './model-type/model-type.module';
import { TaskConfigModule } from './task-config/task-config.module';
import { UserModule } from './user/user.module';
import { LtiModule } from './lti/lti.module';
import { JenkinsResultModule } from './JenkinsResult/jenkins-result.module';
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
    ModelTypeModule,
    TaskConfigModule,
    JenkinsResultModule,
    UserModule,
    LtiModule,
  ],
})
export class AppModule {}
