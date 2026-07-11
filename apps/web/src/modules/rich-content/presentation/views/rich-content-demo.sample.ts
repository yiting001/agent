/** 演示页默认内容：覆盖表格、ECharts 仪表盘/折线图、Mermaid 流程图与失败兜底场景。 */
export const richContentDemoSample = `## 方案对比

| 对比维度 | 综合应急预案 | 专项应急预案 |
| --- | --- | --- |
| 定位 | 纲领性、综合性 | 针对特定事故类型 |
| 推荐度 | 100 | 95 |

## 推荐度仪表盘（ECharts gauge）

\`\`\`echarts
{
  "series": [
    {
      "type": "gauge",
      "min": 0,
      "max": 100,
      "detail": { "formatter": "{value} 分" },
      "data": [{ "value": 100, "name": "综合应急预案" }]
    }
  ]
}
\`\`\`

## 月度事故趋势（ECharts 折线图）

\`\`\`echarts
{
  "xAxis": { "type": "category", "data": ["1月", "2月", "3月", "4月", "5月", "6月"] },
  "yAxis": { "type": "value" },
  "series": [{ "type": "line", "data": [5, 3, 4, 2, 1, 2], "smooth": true }]
}
\`\`\`

## 处置流程（Mermaid）

\`\`\`mermaid
flowchart LR
  A[事故发生] --> B[信息上报]
  B --> C[启动预案]
  C --> D[现场处置]
\`\`\`

## 兜底演示：Mermaid 不支持的 gauge 语法

\`\`\`mermaid
gauge title 预案类型应用推荐度
  "综合应急预案" : 100
  "专项应急预案" : 95
\`\`\`
`;
