import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import type { ApplicationConfig } from './config/application.config';
import { ApplicationErrorFilter } from './shared/presentation/application-error.filter';

/** 装配代理信任、CORS、输入白名单、错误映射和 OpenAPI 后启动 HTTP 服务。 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const config = configService.getOrThrow<ApplicationConfig>('application');

  if (config.httpTrustProxyHops > 0) {
    app.set('trust proxy', config.httpTrustProxyHops);
  }

  app.enableCors({
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Agent-Id',
      'X-File-Name',
      'X-Memory-Owner-Token',
    ],
    exposedHeaders: ['X-Trace-Id'],
    maxAge: 86_400,
    methods: ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
    origin: config.corsOrigin,
  });
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
