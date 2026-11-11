import 'server-only';
import { shortLivedSigner } from '@/lib/auth/session';

/**
 * 프록시(`/api/proxy/*`)가 서버 목(`/api/[...slug]`)으로 넘기는 호출에만 붙는 내부 호출 증명.
 * 서버 목 라우트는 세션 검증도 인가 표도 없는 자리라, 증명 없이 `/api/<경로>` 를 직접 부르면 받지 않는다.
 * 값은 SESSION_SECRET 으로 서명한 30초짜리 JWT(HS256). 검증은 jose 가 WebCrypto 로 한다(상수 시간 비교).
 * `use` 로 용도를 가른다. 같은 비밀키로 서명한 세션 JWT 나 OIDC 트랜잭션 값을 증명으로 내밀어도 통과하지 못한다.
 */
export const MOCK_PROOF_HEADER = 'x-mock-proof';
const USE = 'server-mock';
const TTL = '30s';

export const signMockProof = (role: string, requestId: string): Promise<string> =>
  shortLivedSigner.sign({ use: USE, role, rid: requestId }, TTL);

/** 증명이 맞으면 그 안의 역할, 없거나 틀리면 null */
export const verifyMockProof = async (token: string | null): Promise<string | null> => {
  if (!token) return null;
  const claims = await shortLivedSigner.verify(token);
  return claims?.use === USE && typeof claims.role === 'string' ? claims.role : null;
};
