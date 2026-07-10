import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  applicationConfig,
  type ApplicationConfig,
} from './config/application.config';
import { InitialKnowledgePlatform1752150000000 } from './database/migrations/1752150000000-initial-knowledge-platform';
import { HealthModule } from './modules/health/health.module';
import { AgentsModule } from './modules/agents/agents.module';
import { ApiAccessModule } from './modules/api-access/api-access.module';
import { ChatModule } from './modules/chat/chat.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { ModelProvidersModule } from './modules/model-providers/model-providers.module';

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
          migrations: [InitialKnowledgePlatform1752150000000],
          migrationsRun: config.databaseMigrationsRun,
          synchronize: config.databaseSynchronize,
          type: 'better-sqlite3' as const,
        };
      },
    }),
    ModelProvidersModule,
    KnowledgeModule,
    AgentsModule,
    ApiAccessModule,
    ChatModule,
    HealthModule,
  ],
})
export class AppModule {}
