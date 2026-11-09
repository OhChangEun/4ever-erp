import { describe, expect, it, vi } from 'vitest';
import { type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/render';
import { useInvalidatingMutation } from './useInvalidatingMutation';

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
