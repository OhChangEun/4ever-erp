import { describe, expect, it } from 'vitest';
import { useMockSource, type MockSource } from './serverMock';
import { collectFailures } from './collect';
import * as api from '@/app/(private)/sales/sales.api';

/**
 * 영업 GET 응답이 스키마를 지키는지 두 목 모두에서 확인한다(타입 2차 카드).
 * 목이 스키마와 다르면 화면은 "형식 오류"를 보인다. 여기서 먼저 잡는다.
 */
const SOURCES: MockSource[] = ['msw', 'server'];

describe.each(SOURCES)('영업 계약 (%s 목)', (source) => {
  it('모든 GET 이 스키마를 지킨다', async () => {
    useMockSource(source);
    const failures = await collectFailures({
      통계: () => api.getSalesStats(),
      고객통계: () => api.getCustomerSalesStats(),
      견적: async () => {
        const { data } = await api.getQuoteList({ page: 0, size: 10 });
        expect(data.length).toBeGreaterThan(0);
        return api.getQuoteDetail(data[0].quotationId);
      },
      주문: async () => {
        const { data } = await api.getOrderList({
          start: '',
          end: '',
          keyword: '',
          type: '',
          status: 'ALL',
          page: 0,
          size: 10,
        });
        expect(data.length).toBeGreaterThan(0);
        return api.getOrderDetail(data[0].salesOrderId);
      },
      고객: async () => {
        const { data } = await api.getCustomerList({ page: 0, size: 10 });
        expect(data.length).toBeGreaterThan(0);
        return api.getCustomerDetail(data[0].customerId);
      },
      분석: () => api.getAnalytics({ startDate: '2026-01-01', endDate: '2026-12-31' }),
      품목: () => api.getItemInfoForNewQuote(),
    });
    expect(failures).toEqual([]);
  });
});
