import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListPromptPoliciesUseCase } from './application/list-prompt-policies.use-case';
import { PromptPolicyRepository } from './application/prompt-policy.repository';
import { PromptPolicyRuntimeService } from './application/prompt-policy-runtime.service';
import { UpdatePromptPolicyUseCase } from './application/update-prompt-policy.use-case';
import { PromptPolicyEntity } from './infrastructure/prompt-policy.entity';
import { TypeOrmPromptPolicyRepository } from './infrastructure/typeorm-prompt-policy.repository';
import { ListPromptPoliciesController } from './presentation/http/list-prompt-policies.controller';
import { UpdatePromptPolicyController } from './presentation/http/update-prompt-policy.controller';

@Module({
  controllers: [ListPromptPoliciesController, UpdatePromptPolicyController],
  exports: [PromptPolicyRuntimeService],
  imports: [TypeOrmModule.forFeature([PromptPolicyEntity])],
  providers: [
    ListPromptPoliciesUseCase,
    PromptPolicyRuntimeService,
    UpdatePromptPolicyUseCase,
    {
      provide: PromptPolicyRepository,
      useClass: TypeOrmPromptPolicyRepository,
    },
  ],
})
export class PromptPoliciesModule {}
