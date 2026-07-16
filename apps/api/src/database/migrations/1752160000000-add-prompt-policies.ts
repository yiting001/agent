import type { MigrationInterface, QueryRunner } from 'typeorm';

const RICH_CONTENT_POLICY_ID = '7ce8c761-0f05-4cf6-9e20-45e965243f36';

/**
 * 默认富内容协议只允许声明式 HTML 和结构化图形数据，不允许模型生成的代码执行。
 */
const RICH_CONTENT_POLICY = `你输出的正文将直接作为受控富内容片段渲染，请遵守以下协议：

1. 默认使用语义化 HTML 片段组织内容，例如 section、header、h1-h4、p、ul、ol、table、blockquote、strong、em、code 和 pre；不要输出 html、head 或 body 标签，也不要把整段 HTML 包在 markdown 代码块中。
2. 简单内容可以使用 Markdown 和 LaTeX；渲染端会将它们转换为安全 HTML。
3. ECharts 使用 echarts 代码块，内容必须是 JSON 对象。
4. D3 使用 d3 代码块，内容必须是 {"type":"bar|line","data":[{"name":"名称","value":数字}]}。
5. Three.js 使用 three 代码块，内容必须是结构化 JSON 场景，只能使用 box、sphere、cylinder、cone、torus 或 plane 基础几何体。
6. Mermaid 流程图使用 mermaid 代码块。
7. 禁止输出 script、style、iframe、object、embed、form 或事件属性；禁止 javascript: URL、外链脚本、外链图片、纹理和任意可执行 JavaScript。
8. 财务报表优先使用语义化表格，并在适合比较或趋势分析时附带 ECharts 或 D3；三维模型只在用户确有空间表达需求时使用 Three.js。
9. 不需要图表时不要为了展示能力而生成图表，始终优先保证事实准确、可读和可降级。`;

export class AddPromptPolicies1752160000000 implements MigrationInterface {
  name = 'AddPromptPolicies1752160000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "prompt_policies" (
        "id" text PRIMARY KEY NOT NULL,
        "key" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "description" text NOT NULL,
        "category" text NOT NULL,
        "source" text NOT NULL,
        "content" text NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "priority" integer NOT NULL,
        "revision" integer NOT NULL DEFAULT 1,
        "createdAt" timestamp with time zone NOT NULL,
        "updatedAt" timestamp with time zone NOT NULL
      )
    `);
    await queryRunner.query(
      `
        INSERT INTO "prompt_policies" (
          "id", "key", "name", "description", "category", "source",
          "content", "enabled", "priority", "revision", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, 100, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [
        RICH_CONTENT_POLICY_ID,
        'rich-content-output',
        '富内容 HTML 输出',
        '控制智能体输出安全 HTML、Markdown 与结构化可视化内容。',
        'output',
        'builtin',
        RICH_CONTENT_POLICY,
      ],
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "prompt_policies"');
  }
}
