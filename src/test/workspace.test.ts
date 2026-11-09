import { describe, expect, it } from 'vitest';

/** 모노레포 1: 앱이 워크스페이스 패키지를 패키지 이름으로 가져온다 */
describe('워크스페이스 패키지', () => {
  it('@everp/eslint-plugin 을 이름으로 불러 규칙 3개를 본다', async () => {
    const { default: plugin } = await import('@everp/eslint-plugin');
    expect(Object.keys(plugin.rules).sort()).toEqual([
      'domain-boundary',
      'no-arbitrary-color',
      'no-component-mutation',
    ]);
  });
});
