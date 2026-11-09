import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/AppError';
import { createQueryClient, QUERY_DEFAULTS, shouldRetry } from './queryClient';

describe('shouldRetry', () => {
  it('network 와 server 는 2회까지 재시도한다', () => {
    const network = new AppError('network', 'n');
    const server = new AppError('server', 's', { status: 500 });
    expect(shouldRetry(0, network)).toBe(true);
    expect(shouldRetry(1, network)).toBe(true);
    expect(shouldRetry(2, network)).toBe(false);
    expect(shouldRetry(0, server)).toBe(true);
    expect(shouldRetry(2, server)).toBe(false);
  });

  it.each([
    'timeout',
    'unauthorized',
    'forbidden',
    'notFound',
    'conflict',
    'badRequest',
    'invalidShape',
  ] as const)('%s 는 재시도하지 않는다', (kind) => {
    expect(shouldRetry(0, new AppError(kind, kind))).toBe(false);
  });

  it('AppError 가 아닌 오류는 재시도하지 않는다', () => {
    expect(shouldRetry(0, new Error('x'))).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('클라이언트 기본값: staleTime 30초, gcTime 5분, 포커스 refetch 켬, retry 는 shouldRetry', () => {
    const q = createQueryClient().getDefaultOptions().queries;
    expect(q?.staleTime).toBe(30_000);
    expect(q?.gcTime).toBe(5 * 60_000);
    expect(q?.refetchOnWindowFocus).toBe(true);
    expect(q?.retry).toBe(shouldRetry);
    expect(QUERY_DEFAULTS.staleTime).toBe(30_000);
  });

  it('서버용은 재시도하지 않는다', () => {
    const q = createQueryClient({ server: true }).getDefaultOptions().queries;
    expect(q?.retry).toBe(false);
    expect(q?.staleTime).toBe(30_000);
  });

  it('mutation 은 재시도하지 않는다', () => {
    expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
  });
});
