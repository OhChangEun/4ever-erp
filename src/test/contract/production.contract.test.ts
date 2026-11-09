import { describe, expect, it } from 'vitest';
import { useMockSource, type MockSource } from './serverMock';
import { collectFailures } from './collect';
import * as api from '@/app/(private)/production/api/production.api';

/** 생산 읽기 응답이 스키마를 지키는지 두 목 모두에서 확인한다(타입 2차 카드) */
const SOURCES: MockSource[] = ['msw', 'server'];

describe.each(SOURCES)('생산 계약 (%s 목)', (source) => {
  it('모든 읽기가 스키마를 지킨다', async () => {
    useMockSource(source);
    const failures = await collectFailures({
      통계: () => api.fetchProductionStats(),
      견적과시뮬레이션: async () => {
        const { content } = await api.fetchQuotationList({
          availableStatusCode: 'ALL',
          page: 0,
          size: 10,
        });
        expect(content.length).toBeGreaterThan(0);
        return api.fetchQuotationSimulationResult({
          quotationIds: [content[0].quotationId],
          page: 0,
          size: 1,
        });
      },
      MPS: async () => {
        const products = await api.fetchMpsBomDropdown();
        expect(products.length).toBeGreaterThan(0);
        return api.fetchMpsList({
          bomId: products[0].key,
          startDate: '2026-01-01',
          endDate: '2026-03-31',
          page: 0,
          size: 10,
        });
      },
      BOM: async () => {
        const { content } = await api.fetchBomList({ page: 0, size: 10 });
        expect(content.length).toBeGreaterThan(0);
        return api.fetchBomDetail(content[0].bomId);
      },
      제품: async () => {
        const products = await api.fetchProductDropdown();
        expect(products.length).toBeGreaterThan(0);
        return api.fetchProduction(products[0].key);
      },
      MRP순소요: () =>
        api.fetchMrpOrdersList({ quotationId: '', availableStatusCode: 'ALL', page: 0, size: 10 }),
      MRP계획주문: async () => {
        const { content } = await api.fetchMrpPlannedOrdersList({ page: 0, size: 10 });
        expect(content.length).toBeGreaterThan(0);
        return api.fetchMrpPlannedOrdersDetail(content[0].mrpRunId);
      },
      MES: async () => {
        const { content } = await api.fetchMesList({ page: 0, size: 10 });
        expect(content.length).toBeGreaterThan(0);
        return api.fetchMesDetail(content[0].mesId);
      },
      공정: () => api.fetchOperationDropdown(),
      가용상태: () => api.fetchAvailableStatusDropdown(),
      MRP견적: () => api.fetchMrpQuotationsDropdown(),
      MRP가용상태: () => api.fetchMrpAvailableStatusDropdown(),
      계획주문견적: () => api.fetchMrpPlannedOrderQuotationsDropdown(),
      계획주문상태: () => api.fetchMrpPlannedOrderStatusDropdown(),
      MES상태: () => api.fetchMesStatusDropdown(),
    });
    expect(failures).toEqual([]);
  });
});
