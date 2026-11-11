import { MOCK_PROOF_HEADER, signMockProof } from '@/server/auth/mockProof';

/**
 * 서버 목 라우트(`/api/[...slug]`)를 프록시 없이 부르는 테스트용. 프록시가 붙이는 내부 호출 증명을 대신 만든다.
 * 역할을 안 주면 ALL_ADMIN(역할 헤더 없이 MSW 핸들러를 부른 것과 같은 응답).
 */
export const withMockProof = async (
  headers?: HeadersInit,
  role = 'ALL_ADMIN',
): Promise<Headers> => {
  const result = new Headers(headers);
  result.set(MOCK_PROOF_HEADER, await signMockProof(role, 'test-request'));
  return result;
};
