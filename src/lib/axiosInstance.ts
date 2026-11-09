import axios, { type AxiosResponse } from 'axios';
import { AppError, toAppError } from '@/lib/AppError';

axios.defaults.timeout = 4000;

// 인증 헤더를 여기서 붙이지 않는다.
// 브라우저는 세션 쿠키만 자동으로 보내고, Bearer 토큰은 /api/proxy 가 서버에서 교환한다.

// 실패를 빈 데이터로 바꿔치기하던 fallback 은 2026-11-09 제거했다.
// 데모는 서버 목(src/app/api/[...slug]/route.ts)과 MSW(NEXT_PUBLIC_API_MOCKING)로만 돈다.
// 카드: ai/cards/2026-11-09_오류를_빈_데이터로_숨기는_fallback_제거.md

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * 2xx 인데 응답 래퍼 `ApiResponse<T>` 가 깨진 경우를 invalidShape 로 올린다.
 * 결정(ai/decisions.md "형식 오류 판정 범위"): "success === false" 와 "GET 인데 data 없음" 만 본다.
 * 상태 변경 요청의 빈 본문(204 등)은 통과시킨다.
 */
const assertResponseShape = (response: AxiosResponse): AxiosResponse => {
  const method = (response.config.method ?? 'get').toLowerCase();
  const body: unknown = response.data;
  // 형식 오류도 서버 로그와 잇는다(옵저버빌리티 1)
  const header: unknown = response.headers['x-request-id'];
  const meta = {
    status: response.status,
    requestId: typeof header === 'string' ? header : undefined,
  };

  if (method !== 'get' && (body === '' || body === undefined || body === null)) {
    return response;
  }
  if (!isRecord(body)) {
    throw new AppError('invalidShape', '응답 본문이 객체가 아닙니다.', meta);
  }
  if (body.success === false) {
    const message =
      typeof body.message === 'string' ? body.message : 'success 가 false 인 2xx 응답';
    throw new AppError('invalidShape', message, meta);
  }
  if (method === 'get' && !('data' in body)) {
    throw new AppError('invalidShape', 'data 필드가 없는 응답입니다.', meta);
  }
  return response;
};

axios.interceptors.response.use(assertResponseShape, (error: unknown) => {
  // 쿼리 취소(cancelQueries, AbortSignal)는 오류가 아니다. TanStack Query 가 알아서 버린다.
  if (axios.isCancel(error)) return Promise.reject(error);
  return Promise.reject(toAppError(error));
});

export default axios;
