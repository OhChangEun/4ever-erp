import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { cache } from 'react';
import { type AppError, isAppError } from '@/lib/AppError';

/**
 * 다중 사용자 ERP 기준 캐시 기본값. 결정: ai/decisions.md 2026-11-09 "queryClient 기본값".
 * 화면이 서버와 어긋나지 않는 쪽(우선순위 1)을 택해 포커스 refetch 비용을 감수한다.
 */
export const QUERY_DEFAULTS = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retryCount: 2,
} as const;

/**
 * 네트워크 끊김과 5xx 만 2회 재시도한다. 4xx, 타임아웃, 형식 오류는 다시 보내도 같다.
 * 타임아웃을 빼는 이유: 4초 × 3 = 12초를 기다리게 한다(카드 결정 1).
 */
export const shouldRetry = (failureCount: number, error: unknown): boolean =>
  isAppError(error) &&
  (error.kind === 'network' || error.kind === 'server') &&
  failureCount < QUERY_DEFAULTS.retryCount;

interface CreateQueryClientOptions {
  /** 401 이 쿼리나 mutation 에서 나오면 한 번 불린다. 결정 8: 처리 위치는 여기 한 곳 */
  onUnauthorized?: (error: AppError) => void;
  /** 서버 컴포넌트 prefetch 용. 재시도하면 렌더가 멈추므로 끈다 */
  server?: boolean;
}

export const createQueryClient = ({
  onUnauthorized,
  server = false,
}: CreateQueryClientOptions = {}): QueryClient => {
  // 여러 쿼리가 동시에 401 을 받아도 로그인 이동은 한 번이면 된다.
  // 이동은 전체 새로고침이라 이 플래그는 클라이언트 수명과 같이 끝난다.
  let unauthorizedNotified = false;
  const handleError = (error: unknown) => {
    if (!onUnauthorized || unauthorizedNotified) return;
    if (!isAppError(error) || error.kind !== 'unauthorized') return;
    unauthorizedNotified = true;
    onUnauthorized(error);
  };

  return new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: {
        staleTime: QUERY_DEFAULTS.staleTime,
        gcTime: QUERY_DEFAULTS.gcTime,
        refetchOnWindowFocus: true,
        retry: server ? false : shouldRetry,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

/** 서버 컴포넌트에서 요청 한 번에 하나. prefetch 뒤 dehydrate 해서 넘긴다. */
export const getQueryClient = cache(() => createQueryClient({ server: true }));
