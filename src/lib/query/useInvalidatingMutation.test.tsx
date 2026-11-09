import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@/lib/AppError';
import { type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/render';
import { optimisticPatch, useInvalidatingMutation } from './useInvalidatingMutation';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
);

const delayed = <T,>(value: T, ms: number) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

describe('useInvalidatingMutation 중복 제출 안전망', () => {
  it('진행 중에 mutate 를 다시 부르면 두 번째는 무시한다', async () => {
    const mutationFn = vi.fn((id: string) => delayed(id, 50));
    const { result } = renderHook(
      () =>
        useInvalidatingMutation<string, string>({
          mutationKey: ['test', 'guard'],
          mutationFn,
          effects: () => [],
        }),
      { wrapper },
    );

    act(() => {
      result.current.mutate('a');
      result.current.mutate('a');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mutationFn).toHaveBeenCalledTimes(1);
  });

  it('끝난 뒤에는 다시 부를 수 있다', async () => {
    const mutationFn = vi.fn((id: string) => delayed(id, 10));
    const { result } = renderHook(
      () =>
        useInvalidatingMutation<string, string>({
          mutationKey: ['test', 'guard2'],
          mutationFn,
          effects: () => [],
        }),
      { wrapper },
    );
    act(() => result.current.mutate('a'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    act(() => result.current.mutate('b'));
    await waitFor(() => expect(mutationFn).toHaveBeenCalledTimes(2));
  });

  it('mutateAsync 는 막지 않는다(순차 호출과 테스트용)', async () => {
    const mutationFn = vi.fn((id: string) => delayed(id, 10));
    const { result } = renderHook(
      () =>
        useInvalidatingMutation<string, string>({
          mutationKey: ['test', 'guard3'],
          mutationFn,
          effects: () => [],
        }),
      { wrapper },
    );
    await Promise.all([result.current.mutateAsync('a'), result.current.mutateAsync('b')]);
    expect(mutationFn).toHaveBeenCalledTimes(2);
  });
});

describe('useInvalidatingMutation 낙관적 업데이트', () => {
  interface Row {
    id: string;
    name: string;
  }
  interface ListCache {
    data: Row[];
  }
  const PAGE_0 = ['test', 'rows', 'list', { page: 0 }];
  const PAGE_1 = ['test', 'rows', 'list', { page: 1 }];
  const LIST_PREFIX = ['test', 'rows', 'list'];

  const setup = (fail: boolean) => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData<ListCache>(PAGE_0, { data: [{ id: 'a', name: '옛 이름' }] });
    queryClient.setQueryData<ListCache>(PAGE_1, { data: [{ id: 'b', name: '다른 행' }] });
    const local = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () =>
        useInvalidatingMutation<string, { id: string; name: string }>({
          mutationKey: ['test', 'rename'],
          mutationFn: () =>
            delayed('ok', 200).then((value) => (fail ? Promise.reject(new Error('500')) : value)),
          effects: () => [LIST_PREFIX],
          optimistic: ({ id, name }) => [
            optimisticPatch<ListCache>(LIST_PREFIX, (old) => ({
              ...old,
              data: old.data.map((row) => (row.id === id ? { ...row, name } : row)),
            })),
          ],
        }),
      { wrapper: local },
    );
    return { queryClient, result };
  };

  it('응답 전에 prefix 가 같은 모든 페이지 캐시에 적용한다', async () => {
    const { queryClient, result } = setup(false);
    act(() => result.current.mutate({ id: 'a', name: '새 이름' }));
    await waitFor(() =>
      expect(queryClient.getQueryData<ListCache>(PAGE_0)?.data[0]?.name).toBe('새 이름'),
    );
    expect(queryClient.getQueryData<ListCache>(PAGE_1)?.data[0]?.name).toBe('다른 행');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(queryClient.getQueryState(PAGE_0)?.isInvalidated).toBe(true));
  });

  it('실패하면 원래 값으로 되돌리고, 그래도 무효화한다', async () => {
    const { queryClient, result } = setup(true);
    act(() => result.current.mutate({ id: 'a', name: '새 이름' }));
    await waitFor(() =>
      expect(queryClient.getQueryData<ListCache>(PAGE_0)?.data[0]?.name).toBe('새 이름'),
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<ListCache>(PAGE_0)?.data[0]?.name).toBe('옛 이름');
    await waitFor(() => expect(queryClient.getQueryState(PAGE_0)?.isInvalidated).toBe(true));
  });
});

describe('낙관적 반영이 실패해도 저장은 간다', () => {
  it('캐시 모양이 달라 patch 가 던져도 mutationFn 은 불리고 캐시는 원래대로다', async () => {
    const queryClient = createTestQueryClient();
    const KEY = ['test', 'odd'];
    queryClient.setQueryData(KEY, { unexpected: true });
    const mutationFn = vi.fn(() => delayed('ok', 10));
    const local = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = renderHook(
      () =>
        useInvalidatingMutation<string, void>({
          mutationKey: ['test', 'odd'],
          mutationFn,
          effects: () => [KEY],
          optimistic: () => [
            optimisticPatch<{ data: string[] }>(KEY, (old) => ({ data: old.data.map((x) => x) })),
          ],
        }),
      { wrapper: local },
    );
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(KEY)).toEqual({ unexpected: true });
    warn.mockRestore();
  });
});

describe('겹치는 낙관적 mutation 은 같은 범위에서 한 줄로 선다', () => {
  it('같은 캐시를 고치는 두 요청이 둘 다 실패하면 원래 값으로 돌아간다 (리뷰 A1)', async () => {
    interface Item {
      stock: number;
      safety: number;
    }
    const KEY = ['test', 'item', 'detail', 'item-1'];
    const queryClient = createTestQueryClient();
    queryClient.setQueryData<Item>(KEY, { stock: 100, safety: 10 });
    const local = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const failLater = () => delayed('x', 80).then(() => Promise.reject(new Error('500')));

    const { result } = renderHook(
      () => ({
        safety: useInvalidatingMutation<string, number>({
          mutationKey: ['test', 'safety'],
          mutationFn: failLater,
          effects: () => [],
          optimisticScope: 'test-item',
          optimistic: (safety) => [optimisticPatch<Item>(KEY, (old) => ({ ...old, safety }))],
        }),
        move: useInvalidatingMutation<string, number>({
          mutationKey: ['test', 'move'],
          mutationFn: failLater,
          effects: () => [],
          optimisticScope: 'test-item',
          optimistic: (qty) => [
            optimisticPatch<Item>(KEY, (old) => ({ ...old, stock: old.stock - qty })),
          ],
        }),
      }),
      { wrapper: local },
    );

    act(() => {
      result.current.safety.mutate(20);
      result.current.move.mutate(30);
    });
    await waitFor(() => {
      expect(result.current.safety.isError).toBe(true);
      expect(result.current.move.isError).toBe(true);
    });
    expect(queryClient.getQueryData<Item>(KEY)).toEqual({ stock: 100, safety: 10 });
  });
});

describe('409 충돌이면 화면을 서버에 맞춘다', () => {
  const KEY = ['test', 'conflict', 'detail'];
  const run = async (error: Error) => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(KEY, { version: 'v1' });
    const local = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () =>
        useInvalidatingMutation<string, void>({
          mutationKey: ['test', 'conflict'],
          mutationFn: () => Promise.reject(error),
          effects: () => [KEY],
        }),
      { wrapper: local },
    );
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isError).toBe(true));
    return queryClient;
  };

  it('409 면 무효화 키를 다시 가져오게 표시한다', async () => {
    const queryClient = await run(new AppError('conflict', '먼저 수정됨', { status: 409 }));
    await waitFor(() => expect(queryClient.getQueryState(KEY)?.isInvalidated).toBe(true));
  });

  it('500 이면 서버가 안 바뀌었으니 무효화하지 않는다', async () => {
    const queryClient = await run(new AppError('server', '서버 오류', { status: 500 }));
    expect(queryClient.getQueryState(KEY)?.isInvalidated).toBe(false);
  });
});
