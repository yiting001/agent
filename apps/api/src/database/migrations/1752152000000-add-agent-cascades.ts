import {
  type MigrationInterface,
  type QueryRunner,
  TableForeignKey,
} from 'typeorm';

const agentModuleForeignKey = 'FK_agent_modules_agent';
const apiApplicationForeignKey = 'FK_api_applications_agent';

export class AddAgentCascades1752152000000 implements MigrationInterface {
  name = 'AddAgentCascades1752152000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createForeignKeys('agent_knowledge_modules', [
      new TableForeignKey({
        columnNames: ['agentId'],
        name: agentModuleForeignKey,
        onDelete: 'CASCADE',
        referencedColumnNames: ['id'],
        referencedTableName: 'agents',
      }),
    ]);
    await queryRunner.createForeignKeys('api_applications', [
      new TableForeignKey({
        columnNames: ['agentId'],
        name: apiApplicationForeignKey,
        onDelete: 'CASCADE',
        referencedColumnNames: ['id'],
        referencedTableName: 'agents',
      }),
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const agentModules = await queryRunner.getTable('agent_knowledge_modules');
    const apiApplications = await queryRunner.getTable('api_applications');
    const agentModuleConstraint = agentModules?.foreignKeys.find(
      (foreignKey) => foreignKey.name === agentModuleForeignKey,
    );
    const apiApplicationConstraint = apiApplications?.foreignKeys.find(
      (foreignKey) => foreignKey.name === apiApplicationForeignKey,
    );

    if (apiApplicationConstraint) {
      await queryRunner.dropForeignKey(
        'api_applications',
        apiApplicationConstraint,
      );
    }

    if (agentModuleConstraint) {
      await queryRunner.dropForeignKey(
        'agent_knowledge_modules',
        agentModuleConstraint,
      );
    }
  }
}
