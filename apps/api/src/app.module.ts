import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  applicationConfig,
  type ApplicationConfig,
} from './config/application.config';
import { InitialKnowledgePlatform1752150000000 } from './database/migrations/1752150000000-initial-knowledge-platform';
import { AddBrandSettings1752151000000 } from './database/migrations/1752151000000-add-brand-settings';
import { AddAgentSkills1752152000000 } from './database/migrations/1752152000000-add-agent-skills';
import { AddObservability1752153000000 } from './database/migrations/1752153000000-add-observability';
import { AddAgentMemory1752154000000 } from './database/migrations/1752154000000-add-agent-memory';
import { AddEpisodicMemoryArtifacts1752155000000 } from './database/migrations/1752155000000-add-episodic-memory-artifacts';
import { BrandingModule } from './modules/branding/branding.module';
import { HealthModule } from './modules/health/health.module';
import { AgentMemoryModule } from './modules/agent-memory/agent-memory.module';
import { AgentsModule } from './modules/agents/agents.module';
import { ApiAccessModule } from './modules/api-access/api-access.module';
import { ChatModule } from './modules/chat/chat.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { ModelProvidersModule } from './modules/model-providers/model-providers.module';
import { SkillsModule } from './modules/skills/skills.module';
import { ObservabilityModule } from './modules/observability/observability.module';

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
          migrations: [
            InitialKnowledgePlatform1752150000000,
            AddBrandSettings1752151000000,
            AddAgentSkills1752152000000,
            AddObservability1752153000000,
            AddAgentMemory1752154000000,
            AddEpisodicMemoryArtifacts1752155000000,
          ],
          migrationsRun: config.databaseMigrationsRun,
          synchronize: config.databaseSynchronize,
          type: 'better-sqlite3' as const,
        };
      },
    }),
    ModelProvidersModule,
    ObservabilityModule,
    AgentMemoryModule,
    BrandingModule,
    KnowledgeModule,
    SkillsModule,
    AgentsModule,
    ApiAccessModule,
    ChatModule,
    HealthModule,
  ],
})
export class AppModule {}
