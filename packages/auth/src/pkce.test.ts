import { describe, expect, it } from 'vitest';
import { createCodeChallenge, generateRandomBase64Url } from './pkce';

describe('PKCE', () => {
  it('RFC 7636 부록 B 의 예시 값과 같은 code_challenge 를 만든다', async () => {
    await expect(createCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).resolves.toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('난수 문자열은 URL 에 그대로 넣을 수 있다', () => {
    const value = generateRandomBase64Url(32);
    expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(value).toHaveLength(43);
  });
});
