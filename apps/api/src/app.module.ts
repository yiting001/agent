import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  applicationConfig,
  type ApplicationConfig,
} from './config/application.config';
import { HealthModule } from './modules/health/health.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      load: [applicationConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config =
          configService.getOrThrow<ApplicationConfig>('application');

        return {
          autoLoadEntities: true,
          database: config.databasePath,
          synchronize: config.databaseSynchronize,
          type: 'better-sqlite3' as const,
        };
      },
    }),
    HealthModule,
    KnowledgeModule,
  ],
})
export class AppModule {}
