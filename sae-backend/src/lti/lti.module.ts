import { Module } from '@nestjs/common';
import { LtiService } from './lti.service';
//import { LtiController } from './lti.controller';

@Module({
  //controllers: [LtiController],
  providers: [LtiService],
})
export class LtiModule {}
