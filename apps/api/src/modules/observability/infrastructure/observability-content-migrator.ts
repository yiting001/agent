import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { DataSource, MoreThan, type QueryRunner } from 'typeorm';

import { ObservabilityContentCipher } from '../application/observability-content-cipher';
import { ObservabilityGenerationContentEntity } from './observability-generation-content.entity';
import {
  encryptContentColumns,
  readPersistedContent,
} from './observability-content-persistence';

const ADVISORY_LOCK_NAMESPACE =
  'observability-generation-content-encryption-migration:v1';
const MIGRATION_BATCH_SIZE = 100;

/** 启动前迁移旧明文并把旧 key version 轮换到 active version。 */
@Injectable()
export class ObservabilityContentMigrator implements OnApplicationBootstrap {
  private readonly logger = new Logger(ObservabilityContentMigrator.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly cipher: ObservabilityContentCipher,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    let locked = false;

    try {
      await queryRunner.query('SELECT pg_advisory_lock(hashtext($1))', [
        ADVISORY_LOCK_NAMESPACE,
      ]);
      locked = true;
      const migrated = await this.migrateBatches(queryRunner);

      if (migrated > 0) {
        this.logger.log(`已加密或轮换 ${migrated} 条观测正文记录。`);
      }
    } finally {
      if (locked) {
        await queryRunner.query('SELECT pg_advisory_unlock(hashtext($1))', [
          ADVISORY_LOCK_NAMESPACE,
        ]);
      }

      await queryRunner.release();
    }
  }

  private async migrateBatches(queryRunner: QueryRunner): Promise<number> {
    let cursor = '';
    let migrated = 0;

    while (true) {
      const repository = queryRunner.manager.getRepository(
        ObservabilityGenerationContentEntity,
      );
      const rows = await repository.find({
        order: { generationId: 'ASC' },
        take: MIGRATION_BATCH_SIZE,
        where: cursor ? { generationId: MoreThan(cursor) } : {},
      });

      if (rows.length === 0) {
        return migrated;
      }

      await queryRunner.startTransaction();

      try {
        for (const row of rows) {
          const payload = readPersistedContent(this.cipher, row);
          const requiresRewrite =
            row.keyVersion !== this.cipher.activeKeyVersion ||
            row.inputMessages !== null ||
            row.outputText !== null;

          if (requiresRewrite) {
            await repository.update(
              { generationId: row.generationId },
              encryptContentColumns(this.cipher, row.generationId, payload),
            );
            migrated += 1;
          }
        }

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      }

      cursor = rows.at(-1)?.generationId ?? cursor;
    }
  }
}
