import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JenkinsResultController } from './jenkins-result.controller';
import { JenkinsResult, JenkinsResultSchema } from './entities/jenkins-result.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JenkinsResult.name, schema: JenkinsResultSchema },
    ]),
  ],
  controllers: [JenkinsResultController],
})
export class JenkinsResultModule {}
