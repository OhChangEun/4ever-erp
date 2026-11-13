import { describe, expect, it } from 'vitest';
import type { QueryKey, QueryMeta } from '@tanstack/react-query';
import { quoteKeys, salesOrderKeys, salesStatsKeys } from '@/app/(private)/sales/sales.keys';
import { shippingKeys } from '@/app/(private)/inventory/inventory.keys';
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

describe('상세 404 뒤 목록(카드 "없는 건은 404", 리뷰 A1: 쿼리 meta.listOnNotFound)', () => {
  const LIST = quoteKeys.list({ page: 0, size: 10 });
  const OTHER_LIST = [...salesOrderKeys.lists(), { page: 0 }];
  const STATS = salesStatsKeys.all;
  const DETAIL = quoteKeys.detail('gone');
  const OTHER_DETAIL = quoteKeys.detail('other');
  const OTHER_REVIEW = quoteKeys.reviewDetail('other');

  const failQuery = async (
    error: AppError,
    queryKey: QueryKey,
    meta: QueryMeta | undefined,
    cached: QueryKey[],
  ) => {
    const client = createQueryClient();
    for (const key of cached) client.setQueryData(key, 'cached');
    await client
      .fetchQuery({ queryKey, queryFn: () => Promise.reject(error), retry: false, meta })
      .catch(() => undefined);
    return (key: QueryKey) => client.getQueryState(key)?.isInvalidated;
  };
  const notFound = new AppError('notFound', 'gone', { status: 404 });
  const quoteLists = { listOnNotFound: quoteKeys.lists() };

  it('상세가 404 면 meta 에 적은 목록만 다시 받는다(다른 엔터티 목록, 통계, 다른 상세와 검토 상세는 그대로)', async () => {
    const invalidated = await failQuery(notFound, DETAIL, quoteLists, [
      LIST,
      OTHER_LIST,
      STATS,
      OTHER_DETAIL,
      OTHER_REVIEW,
    ]);
    expect(invalidated(LIST)).toBe(true);
    expect(invalidated(OTHER_LIST)).toBe(false);
    expect(invalidated(STATS)).toBe(false);
    expect(invalidated(OTHER_DETAIL)).toBe(false);
    expect(invalidated(OTHER_REVIEW)).toBe(false);
  });

  it('견적 검토 상세(reviewDetail)가 404 여도 견적 목록을 다시 받는다', async () => {
    const invalidated = await failQuery(notFound, quoteKeys.reviewDetail('gone'), quoteLists, [
      LIST,
      OTHER_DETAIL,
    ]);
    expect(invalidated(LIST)).toBe(true);
    expect(invalidated(OTHER_DETAIL)).toBe(false);
  });

  it("목록 키 이름이 'list' 가 아닌 엔터티(출고 준비)도 meta 에 적은 목록을 다시 받는다", async () => {
    const readyToShip = shippingKeys.readyToShipList({ page: 0, size: 10 });
    const production = shippingKeys.productionList({ page: 0, size: 10 });
    const invalidated = await failQuery(
      notFound,
      shippingKeys.detail('readyToShip', 'so-9'),
      { listOnNotFound: shippingKeys.readyToShipLists() },
      [readyToShip, production, LIST],
    );
    expect(invalidated(readyToShip)).toBe(true);
    expect(invalidated(production)).toBe(false);
    expect(invalidated(LIST)).toBe(false);
  });

  it("meta 가 없는 쿼리는 404 여도 아무것도 무효화하지 않는다(키에 'detail' 이 있어도)", async () => {
    const invalidated = await failQuery(notFound, DETAIL, undefined, [LIST, OTHER_DETAIL]);
    expect(invalidated(LIST)).toBe(false);
    expect(invalidated(OTHER_DETAIL)).toBe(false);
  });

  it('404 가 아닌 실패(500)는 meta 가 있어도 목록을 건드리지 않는다', async () => {
    const invalidated = await failQuery(
      new AppError('server', 'boom', { status: 500 }),
      DETAIL,
      quoteLists,
      [LIST],
    );
    expect(invalidated(LIST)).toBe(false);
  });
});
