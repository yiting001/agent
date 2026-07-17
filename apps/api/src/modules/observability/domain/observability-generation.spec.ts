import {
  sanitizeGenerationMessages,
  sanitizeGenerationText,
} from './observability-generation';

describe('observability generation redaction', () => {
  it('脱敏密钥、个人信息、路径和 base64 data URI', () => {
    const result = sanitizeGenerationText(
      [
        'Bearer token-secret',
        `mgmt_${'A'.repeat(43)}`,
        'sk-abcdefghijklmnopqrstuvwxyz',
        'api_key=top-secret',
        'user@example.com',
        '13800138000',
        '11010519491231002X',
        '/home/user/private.txt',
        'data:image/png;base64,AAAAABBBBB',
      ].join('\n'),
      10_000,
    );

    expect(result.value).not.toContain('token-secret');
    expect(result.value).not.toContain('mgmt_');
    expect(result.value).not.toContain('user@example.com');
    expect(result.value).not.toContain('13800138000');
    expect(result.value).not.toContain('private.txt');
    expect(result.value).not.toContain('AAAAABBBBB');
    expect(result.redactionCount).toBe(9);
  });

  it('按整个消息集合限制字符数并保留结构化角色', () => {
    const result = sanitizeGenerationMessages(
      [
        { content: '12345', role: 'system' },
        { content: '67890', role: 'user' },
      ],
      7,
    );

    expect(result.messages).toEqual([
      { content: '12345', role: 'system' },
      { content: '67', role: 'user' },
    ]);
    expect(result.truncated).toBe(true);
  });
});
