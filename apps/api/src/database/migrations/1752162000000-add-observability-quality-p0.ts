import type { MigrationInterface, QueryRunner } from 'typeorm';

import { parseObservabilityEncryptionConfiguration } from '../../config/observability-encryption.config';
import type { EncryptedObservabilityContent } from '../../modules/observability/application/observability-content-cipher';
import { decryptObservabilityContent } from '../../modules/observability/infrastructure/observability-content-crypto';

interface EncryptedContentRow extends EncryptedObservabilityContent {
  generationId: string;
}

export class AddObservabilityQualityP01752162000000
  implements MigrationInterface
{
  name = 'AddObservabilityQualityP01752162000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" ADD "ciphertext" text',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" ADD "initializationVector" text',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" ADD "authTag" text',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" ADD "keyVersion" text',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" ALTER COLUMN "inputMessages" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" ALTER COLUMN "inputMessages" DROP NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" ALTER COLUMN "outputText" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" ALTER COLUMN "outputText" DROP NOT NULL',
    );
    await queryRunner.query(`
      ALTER TABLE "observability_generation_contents"
      ADD CONSTRAINT "CHK_observability_generation_contents_storage"
      CHECK (
        (
          "inputMessages" IS NOT NULL AND
          "outputText" IS NOT NULL AND
          "ciphertext" IS NULL AND
          "initializationVector" IS NULL AND
          "authTag" IS NULL AND
          "keyVersion" IS NULL
        ) OR (
          "inputMessages" IS NULL AND
          "outputText" IS NULL AND
          "ciphertext" IS NOT NULL AND
          "initializationVector" IS NOT NULL AND
          "authTag" IS NOT NULL AND
          "keyVersion" IS NOT NULL
        )
      )
    `);

    await queryRunner.query(
      'ALTER TABLE "observability_feedback" ADD "reviewStatus" text',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_feedback" ADD "reviewerSubject" text',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_feedback" ADD "reviewReason" text',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_feedback" ADD "reviewedAt" timestamp with time zone',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_feedback" ADD "convertedAt" timestamp with time zone',
    );
    await queryRunner.query(`
      UPDATE "observability_feedback"
      SET "reviewStatus" = 'pending'
      WHERE "rating" = 'negative'
    `);
    await queryRunner.query(`
      ALTER TABLE "observability_feedback"
      ADD CONSTRAINT "CHK_observability_feedback_review_state"
      CHECK (COALESCE((
        (
          "reviewStatus" IS NULL AND
          "rating" = 'positive' AND
          "reviewerSubject" IS NULL AND
          "reviewReason" IS NULL AND
          "reviewedAt" IS NULL AND
          "convertedAt" IS NULL
        ) OR (
          "reviewStatus" = 'pending' AND
          "rating" = 'negative' AND
          "reviewerSubject" IS NULL AND
          "reviewReason" IS NULL AND
          "reviewedAt" IS NULL AND
          "convertedAt" IS NULL
        ) OR (
          "reviewStatus" IN ('accepted', 'rejected') AND
          "rating" = 'negative' AND
          "reviewerSubject" IS NOT NULL AND
          "reviewReason" IS NOT NULL AND
          "reviewedAt" IS NOT NULL AND
          "convertedAt" IS NULL
        ) OR (
          "reviewStatus" = 'converted' AND
          "rating" IN ('negative', 'positive') AND
          "reviewerSubject" IS NOT NULL AND
          "reviewReason" IS NOT NULL AND
          "reviewedAt" IS NOT NULL AND
          "convertedAt" IS NOT NULL
        )
      ), false))
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_observability_feedback_review_queue"
      ON "observability_feedback" ("reviewStatus", "updatedAt" DESC)
    `);

    await queryRunner.query(
      `ALTER TABLE "evaluation_cases" ADD "source" text NOT NULL DEFAULT 'manual'`,
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_cases" ADD "sourceGenerationId" text',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_cases" ADD "sourceFeedbackId" text',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_cases" ADD "expectedOutput" text',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_cases" ADD "evaluationCriteria" text',
    );
    await queryRunner.query(
      `ALTER TABLE "evaluation_cases" ADD "tags" jsonb NOT NULL DEFAULT ('[]'::jsonb)`,
    );
    await queryRunner.query(`
      ALTER TABLE "evaluation_cases"
      ADD CONSTRAINT "UQ_evaluation_cases_source_feedback"
      UNIQUE ("sourceFeedbackId")
    `);
    await queryRunner.query(`
      ALTER TABLE "evaluation_cases"
      ADD CONSTRAINT "FK_evaluation_cases_source_generation"
      FOREIGN KEY ("sourceGenerationId")
      REFERENCES "observability_generations" ("id")
      ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "evaluation_cases"
      ADD CONSTRAINT "FK_evaluation_cases_source_feedback"
      FOREIGN KEY ("sourceFeedbackId")
      REFERENCES "observability_feedback" ("id")
      ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      ALTER TABLE "evaluation_cases"
      ADD CONSTRAINT "CHK_evaluation_cases_source"
      CHECK (
        (
          "source" = 'manual' AND
          "sourceGenerationId" IS NULL AND
          "sourceFeedbackId" IS NULL
        ) OR (
          "source" = 'feedback' AND
          "sourceGenerationId" IS NOT NULL AND
          "sourceFeedbackId" IS NOT NULL
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "management_audit_logs" (
        "id" text PRIMARY KEY NOT NULL,
        "subject" text NOT NULL,
        "action" text NOT NULL,
        "resourceType" text NOT NULL,
        "resourceId" text,
        "result" text NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT ('{}'::jsonb),
        "createdAt" timestamp with time zone NOT NULL,
        CONSTRAINT "CHK_management_audit_logs_result"
          CHECK ("result" IN ('succeeded', 'failed', 'denied'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_management_audit_logs_subject_created"
      ON "management_audit_logs" ("subject", "createdAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_management_audit_logs_created"
      ON "management_audit_logs" ("createdAt" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.restorePlaintextContents(queryRunner);

    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_management_audit_logs_created"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_management_audit_logs_subject_created"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "management_audit_logs"');

    await queryRunner.query(
      'ALTER TABLE "evaluation_cases" DROP CONSTRAINT "CHK_evaluation_cases_source"',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_cases" DROP CONSTRAINT "FK_evaluation_cases_source_feedback"',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_cases" DROP CONSTRAINT "FK_evaluation_cases_source_generation"',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_cases" DROP CONSTRAINT "UQ_evaluation_cases_source_feedback"',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_cases" DROP COLUMN "tags"',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_cases" DROP COLUMN "evaluationCriteria"',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_cases" DROP COLUMN "expectedOutput"',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_cases" DROP COLUMN "sourceFeedbackId"',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_cases" DROP COLUMN "sourceGenerationId"',
    );
    await queryRunner.query(
      'ALTER TABLE "evaluation_cases" DROP COLUMN "source"',
    );

    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_observability_feedback_review_queue"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_feedback" DROP CONSTRAINT "CHK_observability_feedback_review_state"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_feedback" DROP COLUMN "convertedAt"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_feedback" DROP COLUMN "reviewedAt"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_feedback" DROP COLUMN "reviewReason"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_feedback" DROP COLUMN "reviewerSubject"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_feedback" DROP COLUMN "reviewStatus"',
    );

    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" DROP CONSTRAINT "CHK_observability_generation_contents_storage"',
    );
    await queryRunner.query(
      `ALTER TABLE "observability_generation_contents" ALTER COLUMN "inputMessages" SET DEFAULT ('[]'::jsonb)`,
    );
    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" ALTER COLUMN "inputMessages" SET NOT NULL',
    );
    await queryRunner.query(
      `ALTER TABLE "observability_generation_contents" ALTER COLUMN "outputText" SET DEFAULT ''`,
    );
    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" ALTER COLUMN "outputText" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" DROP COLUMN "keyVersion"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" DROP COLUMN "authTag"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" DROP COLUMN "initializationVector"',
    );
    await queryRunner.query(
      'ALTER TABLE "observability_generation_contents" DROP COLUMN "ciphertext"',
    );
  }

  private async restorePlaintextContents(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const configuration = parseObservabilityEncryptionConfiguration({
      activeKeyVersion:
        process.env.OBSERVABILITY_CONTENT_ENCRYPTION_ACTIVE_KEY_VERSION,
      credentialEncryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY,
      serializedKeys: process.env.OBSERVABILITY_CONTENT_ENCRYPTION_KEYS,
    });
    const rows: unknown = await queryRunner.query(`
      SELECT
        "generationId",
        "ciphertext",
        "initializationVector",
        "authTag",
        "keyVersion"
      FROM "observability_generation_contents"
      WHERE "ciphertext" IS NOT NULL
      ORDER BY "generationId" ASC
    `);

    if (!Array.isArray(rows)) {
      throw new Error('Unable to read encrypted observability contents.');
    }

    for (const value of rows) {
      const row = this.parseEncryptedRow(value);
      const payload = decryptObservabilityContent(
        configuration,
        row.generationId,
        row,
      );

      await queryRunner.query(
        `UPDATE "observability_generation_contents"
         SET
           "inputMessages" = $2::jsonb,
           "outputText" = $3,
           "ciphertext" = NULL,
           "initializationVector" = NULL,
           "authTag" = NULL,
           "keyVersion" = NULL
         WHERE "generationId" = $1`,
        [
          row.generationId,
          JSON.stringify(payload.inputMessages),
          payload.outputText,
        ],
      );
    }
  }

  private parseEncryptedRow(value: unknown): EncryptedContentRow {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Encrypted observability content row is invalid.');
    }

    const candidate = value as Record<string, unknown>;
    const properties = [
      'generationId',
      'ciphertext',
      'initializationVector',
      'authTag',
      'keyVersion',
    ] as const;

    if (
      properties.some((property) => typeof candidate[property] !== 'string')
    ) {
      throw new Error('Encrypted observability content row is invalid.');
    }

    return candidate as unknown as EncryptedContentRow;
  }
}
