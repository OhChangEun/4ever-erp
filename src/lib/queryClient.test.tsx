import { describe, expect, it, vi } from 'vitest';
import { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import { AppError } from '@/lib/AppError';
import { createQueryClient } from './queryClient';

const wrapperFor = (onUnauthorized: (error: AppError) => void) => {
  const client = createQueryClient({ onUnauthorized });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

const reject = (kind: 'unauthorized' | 'notFound') => () =>
  Promise.reject(new AppError(kind, kind, { status: kind === 'unauthorized' ? 401 : 404 }));

describe('401 은 한 곳에서 한 번만 알린다', () => {
  it('쿼리 두 개가 동시에 401 이어도 onUnauthorized 는 1회', async () => {
    const onUnauthorized = vi.fn();
    const { result } = renderHook(
      () => {
        const a = useQuery({ queryKey: ['a'], queryFn: reject('unauthorized') });
        const b = useQuery({ queryKey: ['b'], queryFn: reject('unauthorized') });
        return { a, b };
      },
      { wrapper: wrapperFor(onUnauthorized) },
    );
    await waitFor(() => {
      expect(result.current.a.isError).toBe(true);
      expect(result.current.b.isError).toBe(true);
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized.mock.calls[0]?.[0]).toBeInstanceOf(AppError);
  });

  it('mutation 의 401 도 같은 곳으로 온다', async () => {
    const onUnauthorized = vi.fn();
    const { result } = renderHook(() => useMutation({ mutationFn: reject('unauthorized') }), {
      wrapper: wrapperFor(onUnauthorized),
    });
    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('401 이 아니면 부르지 않는다', async () => {
    const onUnauthorized = vi.fn();
    const { result } = renderHook(
      () => useQuery({ queryKey: ['c'], queryFn: reject('notFound') }),
      {
        wrapper: wrapperFor(onUnauthorized),
      },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
