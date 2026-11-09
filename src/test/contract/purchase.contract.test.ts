import { describe, expect, it } from 'vitest';
import { useMockSource, type MockSource } from './serverMock';
import { collectFailures } from './collect';
import * as api from '@/app/(private)/purchase/api/purchase.api';

/** 구매 GET 응답이 스키마를 지키는지 두 목 모두에서 확인한다(타입 2차 카드) */
const SOURCES: MockSource[] = ['msw', 'server'];

describe.each(SOURCES)('구매 계약 (%s 목)', (source) => {
  it('모든 GET 이 스키마를 지킨다', async () => {
    useMockSource(source);
    const failures = await collectFailures({
      통계: () => api.fetchPurchaseStats(),
      공급사통계: () => api.fetchSupplierOrdersPurchaseStats(),
      구매요청: async () => {
        const { content } = await api.fetchPurchaseRequestList({ page: 0, size: 10 });
        expect(content.length).toBeGreaterThan(0);
        return api.fetchPurchaseRequestDetail(content[0].purchaseRequisitionId);
      },
      발주: async () => {
        const { content } = await api.fetchPurchaseOrderList({ page: 0, size: 10 });
        expect(content.length).toBeGreaterThan(0);
        return api.fetchPurchaseOrderDetail(content[0].purchaseOrderId);
      },
      공급사: async () => {
        const { content } = await api.fetchSupplierList({ page: 0, size: 10 });
        expect(content.length).toBeGreaterThan(0);
        return api.fetchSupplierDetail(content[0].supplierInfo.supplierId);
      },
      요청상태: () => api.fetchPurchaseRequestStatusOptions(),
      요청검색: () => api.fetchPurchaseRequestSearchTypeOptions(),
      발주상태: () => api.fetchPurchaseOrderStatusOptions(),
      발주검색: () => api.fetchPurchaseOrderSearchTypeOptions(),
      공급사분류: () => api.fetchSupplierCategoryOptions(),
      공급사검색: () => api.fetchSupplierSearchTypeOptions(),
      공급사상태: () => api.fetchSupplierStatusOptions(),
    });
    expect(failures).toEqual([]);
  });
});
