import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ModelProvidersModule } from '../model-providers/model-providers.module';
import { CompleteUploadUseCase } from './application/complete-upload.use-case';
import { CreateKnowledgeBaseUseCase } from './application/create-knowledge-base.use-case';
import { CreateKnowledgeModuleUseCase } from './application/create-knowledge-module.use-case';
import { CreateUploadSessionUseCase } from './application/create-upload-session.use-case';
import { DocumentTextExtractor } from './application/document-text-extractor';
import { GetUploadSessionUseCase } from './application/get-upload-session.use-case';
import { KnowledgeCatalogRepository } from './application/knowledge-catalog.repository';
import { KnowledgeCatalogService } from './application/knowledge-catalog.service';
import { KnowledgeObjectStorage } from './application/knowledge-object-storage';
import { KnowledgeRetrieverService } from './application/knowledge-retriever.service';
import { KnowledgeUploadRepository } from './application/knowledge-upload.repository';
import { ListKnowledgeBasesUseCase } from './application/list-knowledge-bases.use-case';
import { ProcessNextIngestionJobUseCase } from './application/process-next-ingestion-job.use-case';
import { TextChunker } from './application/text-chunker';
import { UploadDocumentPartUseCase } from './application/upload-document-part.use-case';
import { VectorIndex } from './application/vector-index';
import { IngestionScheduler } from './infrastructure/indexing/ingestion.scheduler';
import { ZvecVectorIndex } from './infrastructure/indexing/zvec-vector.index';
import { CompositeDocumentTextExtractor } from './infrastructure/parsing/composite-document-text.extractor';
import { IngestionJobEntity } from './infrastructure/persistence/ingestion-job.entity';
import { KnowledgeBaseEntity } from './infrastructure/persistence/knowledge-base.entity';
import { KnowledgeDocumentEntity } from './infrastructure/persistence/knowledge-document.entity';
import { KnowledgeModuleEntity } from './infrastructure/persistence/knowledge-module.entity';
import { TypeOrmKnowledgeCatalogRepository } from './infrastructure/persistence/typeorm-knowledge-catalog.repository';
import { TypeOrmKnowledgeUploadRepository } from './infrastructure/persistence/typeorm-knowledge-upload.repository';
import { UploadPartEntity } from './infrastructure/persistence/upload-part.entity';
import { UploadSessionEntity } from './infrastructure/persistence/upload-session.entity';
import { LocalKnowledgeObjectStorage } from './infrastructure/storage/local-knowledge-object.storage';
import { CompleteUploadController } from './presentation/http/complete-upload.controller';
import { CreateKnowledgeBaseController } from './presentation/http/create-knowledge-base.controller';
import { CreateKnowledgeModuleController } from './presentation/http/create-knowledge-module.controller';
import { CreateUploadSessionController } from './presentation/http/create-upload-session.controller';
import { GetUploadSessionController } from './presentation/http/get-upload-session.controller';
import { ListKnowledgeBasesController } from './presentation/http/list-knowledge-bases.controller';
import { UploadDocumentPartController } from './presentation/http/upload-document-part.controller';

@Module({
  controllers: [
    CompleteUploadController,
    CreateKnowledgeBaseController,
    CreateKnowledgeModuleController,
    CreateUploadSessionController,
    GetUploadSessionController,
    ListKnowledgeBasesController,
    UploadDocumentPartController,
  ],
  exports: [KnowledgeCatalogService, KnowledgeRetrieverService],
  imports: [
    ModelProvidersModule,
    TypeOrmModule.forFeature([
      IngestionJobEntity,
      KnowledgeBaseEntity,
      KnowledgeDocumentEntity,
      KnowledgeModuleEntity,
      UploadPartEntity,
      UploadSessionEntity,
    ]),
  ],
  providers: [
    CompleteUploadUseCase,
    CreateKnowledgeBaseUseCase,
    CreateKnowledgeModuleUseCase,
    CreateUploadSessionUseCase,
    GetUploadSessionUseCase,
    IngestionScheduler,
    KnowledgeCatalogService,
    KnowledgeRetrieverService,
    ListKnowledgeBasesUseCase,
    ProcessNextIngestionJobUseCase,
    TextChunker,
    UploadDocumentPartUseCase,
    {
      provide: DocumentTextExtractor,
      useClass: CompositeDocumentTextExtractor,
    },
    {
      provide: KnowledgeCatalogRepository,
      useClass: TypeOrmKnowledgeCatalogRepository,
    },
    {
      provide: KnowledgeObjectStorage,
      useClass: LocalKnowledgeObjectStorage,
    },
    {
      provide: KnowledgeUploadRepository,
      useClass: TypeOrmKnowledgeUploadRepository,
    },
    {
      provide: VectorIndex,
      useClass: ZvecVectorIndex,
    },
  ],
})
export class KnowledgeModule {}
