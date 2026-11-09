import { type ReactNode } from 'react';
import { expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { createTestQueryClient } from './render';

/**
 * 무효화 매트릭스 테스트 공통 도구. 키를 심어 두고 훅을 실행한 뒤,
 * 매트릭스의 키는 invalidated, 나머지는 그대로인지 본다.
 */
export const seedKeys = (queryClient: QueryClient, keys: readonly QueryKey[]) => {
  for (const key of keys) queryClient.setQueryData(key, { seeded: true });
};

export const isInvalidated = (queryClient: QueryClient, key: QueryKey) =>
  queryClient.getQueryState(key)?.isInvalidated === true;

const wrapperFor = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

export const runMutationHook = async <TVariables,>(
  queryClient: QueryClient,
  useHook: () => { mutateAsync: (variables: TVariables) => Promise<unknown> },
  variables: TVariables,
) => {
  const { result } = renderHook(useHook, { wrapper: wrapperFor(queryClient) });
  await result.current.mutateAsync(variables);
};

export interface MatrixCase<TVariables> {
  name: string;
  useHook: () => { mutateAsync: (variables: TVariables) => Promise<unknown> };
  variables: TVariables;
  invalidates: QueryKey[];
  keeps: QueryKey[];
}

/** 케이스 하나를 끝까지 돌린다. 심는 키는 포함 키와 제외 키 전부. */
export const expectMatrix = async <TVariables,>({
  useHook,
  variables,
  invalidates,
  keeps,
}: MatrixCase<TVariables>) => {
  const queryClient = createTestQueryClient();
  seedKeys(queryClient, [...invalidates, ...keeps]);
  await runMutationHook(queryClient, useHook, variables);
  await waitFor(() => {
    for (const key of invalidates) expect(isInvalidated(queryClient, key), String(key)).toBe(true);
  });
  for (const key of keeps) {
    // 키가 사라져서 false 가 되는 가짜 초록을 막는다. 시드한 캐시는 그대로 있어야 한다
    expect(queryClient.getQueryState(key), `seeded ${String(key)}`).toBeDefined();
    expect(isInvalidated(queryClient, key), String(key)).toBe(false);
  }
};
