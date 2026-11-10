import { SignJWT, jwtVerify } from 'jose';

/**
 * 짧은 수명 서명 값(OIDC 로그인 트랜잭션: state, nonce, PKCE verifier, returnTo).
 * 서명해야 하는 이유: 쿠키를 바꿔 다른 사람의 code_verifier 나 외부 returnTo 를 끼워 넣지 못하게.
 * 비밀키는 쓰는 시점에 받는다(빌드 머신에 env 가 없어도 import 는 된다).
 */
export interface ShortLivedSigner {
  sign(claims: Record<string, string>, ttl: string): Promise<string>;
  verify(token: string): Promise<Record<string, unknown> | null>;
}

export const createShortLivedSigner = (getSecret: () => Uint8Array): ShortLivedSigner => ({
  sign: (claims, ttl) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ttl)
      .sign(getSecret()),
  async verify(token) {
    const secret = getSecret();
    try {
      const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
      return payload;
    } catch {
      return null;
    }
  },
});
