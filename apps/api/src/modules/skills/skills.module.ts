import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentSkillEntity } from '../agents/infrastructure/agent-skill.entity';
import { DeleteSkillUseCase } from './application/delete-skill.use-case';
import { InstallSkillUseCase } from './application/install-skill.use-case';
import { ListSkillsUseCase } from './application/list-skills.use-case';
import { McpClient } from './application/mcp-client';
import { SkillCatalogService } from './application/skill-catalog.service';
import { SkillRepository } from './application/skill.repository';
import { SkillRuntimeService } from './application/skill-runtime.service';
import { SkillUsage } from './application/skill-usage';
import { UpdateSkillUseCase } from './application/update-skill.use-case';
import { SkillEntity } from './infrastructure/skill.entity';
import { StreamableHttpMcpClient } from './infrastructure/streamable-http-mcp.client';
import { TypeOrmSkillRepository } from './infrastructure/typeorm-skill.repository';
import { TypeOrmSkillUsage } from './infrastructure/typeorm-skill-usage';
import { DeleteSkillController } from './presentation/http/delete-skill.controller';
import { InstallSkillController } from './presentation/http/install-skill.controller';
import { ListSkillsController } from './presentation/http/list-skills.controller';
import { UpdateSkillController } from './presentation/http/update-skill.controller';

@Module({
  controllers: [
    DeleteSkillController,
    InstallSkillController,
    ListSkillsController,
    UpdateSkillController,
  ],
  exports: [SkillCatalogService, SkillRuntimeService],
  imports: [TypeOrmModule.forFeature([AgentSkillEntity, SkillEntity])],
  providers: [
    DeleteSkillUseCase,
    InstallSkillUseCase,
    ListSkillsUseCase,
    SkillCatalogService,
    SkillRuntimeService,
    UpdateSkillUseCase,
    {
      provide: McpClient,
      useClass: StreamableHttpMcpClient,
    },
    {
      provide: SkillRepository,
      useClass: TypeOrmSkillRepository,
    },
    {
      provide: SkillUsage,
      useClass: TypeOrmSkillUsage,
    },
  ],
})
export class SkillsModule {}
