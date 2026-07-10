import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigureModelProviderUseCase } from './application/configure-model-provider.use-case';
import { CredentialCipher } from './application/credential-cipher';
import { ListModelProvidersUseCase } from './application/list-model-providers.use-case';
import { ModelGateway } from './application/model-gateway';
import { ModelProviderRepository } from './application/model-provider.repository';
import { ModelProviderRuntimeService } from './application/model-provider-runtime.service';
import { AesCredentialCipher } from './infrastructure/aes-credential-cipher';
import { ModelProviderEntity } from './infrastructure/model-provider.entity';
import { OpenAiCompatibleGateway } from './infrastructure/openai-compatible.gateway';
import { TypeOrmModelProviderRepository } from './infrastructure/typeorm-model-provider.repository';
import { ConfigureModelProviderController } from './presentation/http/configure-model-provider.controller';
import { ListModelProvidersController } from './presentation/http/list-model-providers.controller';

@Module({
  controllers: [ConfigureModelProviderController, ListModelProvidersController],
  exports: [ModelGateway, ModelProviderRuntimeService, ModelProviderRepository],
  imports: [TypeOrmModule.forFeature([ModelProviderEntity])],
  providers: [
    ConfigureModelProviderUseCase,
    ListModelProvidersUseCase,
    ModelProviderRuntimeService,
    {
      provide: CredentialCipher,
      useClass: AesCredentialCipher,
    },
    {
      provide: ModelGateway,
      useClass: OpenAiCompatibleGateway,
    },
    {
      provide: ModelProviderRepository,
      useClass: TypeOrmModelProviderRepository,
    },
  ],
})
export class ModelProvidersModule {}
