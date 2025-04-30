import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LtiService } from './lti/lti.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();

  const ltiService = app.get(LtiService);
  await ltiService.setupLti(expressApp); 

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();

