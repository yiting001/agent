import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import type { ApplicationConfig } from './config/application.config';
import { ApplicationErrorFilter } from './shared/presentation/application-error.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const config = configService.getOrThrow<ApplicationConfig>('application');

  app.enableCors({ origin: config.corsOrigin });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new ApplicationErrorFilter());

  const openApiConfig = new DocumentBuilder()
    .setTitle('Agent API')
    .setDescription('HTTP interface for Agent application modules')
    .setVersion('0.1.0')
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup('docs', app, openApiDocument);

  await app.listen(config.port);
}

void bootstrap();
