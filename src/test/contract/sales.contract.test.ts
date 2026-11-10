import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw-server';
import { SALES_ENDPOINTS } from '@/app/types/api';
import { useMockSource, type MockSource } from './serverMock';
import { collectFailures } from './collect';
import { declaredQueryEnum, declaredQueryNames, loadContract } from './loadContract';
import * as api from '@/app/(private)/sales/sales.api';
import { QUOTE_STATUS_OPTIONS } from '@/app/(private)/sales/constant';

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
          startDate: '',
          endDate: '',
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

/**
 * 영업 서버 계약 카드(2026-11-11). 목록과 분석이 보내는 쿼리 이름이 계약에 선언돼 있는지 본다.
 * 계약의 파라미터는 게이트웨이 SdController 의 @RequestParam 에서 옮겼다.
 * 옛 이름 start, end 를 보내면 선언에 없어서 여기서 걸린다.
 */
const queryCases = [
  {
    name: '주문 목록',
    contractPath: '/business/sd/orders',
    endpoint: SALES_ENDPOINTS.ORDERS_LIST,
    call: () =>
      api.getOrderList({
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        keyword: 'SO',
        type: 'salesOrderNumber',
        status: 'DELIVERED',
        page: 1,
        size: 10,
      }),
  },
  {
    name: '견적 목록',
    contractPath: '/business/sd/quotations',
    endpoint: SALES_ENDPOINTS.QUOTES_LIST,
    call: () =>
      api.getQuoteList({
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        status: 'REVIEW',
        type: 'quotationNumber',
        keyword: 'QT',
        sort: 'quotationDate,desc',
        page: 1,
        size: 10,
      }),
  },
  {
    name: '매출 분석',
    contractPath: '/business/sd/analytics/sales',
    endpoint: SALES_ENDPOINTS.ANALYTICS,
    call: () => api.getAnalytics({ startDate: '2026-03-01', endDate: '2026-03-31' }),
  },
];

describe.each(queryCases)('영업 계약: $name 쿼리', ({ contractPath, endpoint, call }) => {
  it('화면이 보내는 쿼리 이름이 전부 계약에 선언돼 있다', async () => {
    // 응답은 기본 목이 준다. 나가는 요청의 쿼리 이름만 모은다
    const sent: string[] = [];
    const record = ({ request }: { request: Request }) => {
      const url = new URL(request.url);
      if (url.pathname === new URL(endpoint, 'http://localhost').pathname)
        sent.push(...url.searchParams.keys());
    };
    server.events.on('request:start', record);
    try {
      await call();
    } finally {
      server.events.removeListener('request:start', record);
    }
    expect(sent).toEqual(expect.arrayContaining(['startDate', 'endDate']));
    const declared = declaredQueryNames(loadContract(), contractPath);
    expect(sent.filter((name) => !declared.includes(name))).toEqual([]);
  });
});

/**
 * 영업 서버 계약 2 카드(2026-11-11). 견적 목록 상태 필터 값은 게이트웨이 SdController.java:101 설명과
 * QuotationStatus.java:13 enum 의 APPROVAL 이다. 게이트웨이는 status 를 그대로 업스트림에 넘긴다
 * (SdHttpServiceImpl.java:325). 계약은 이 값만 enum 으로 선언하고, 화면 선택지는 그 안에 있어야 한다.
 * 옛 값 APPROVED 를 보내면 여기서 걸린다.
 */
describe('영업 계약: 견적 목록 상태 필터 값', () => {
  it('계약이 게이트웨이 상태 값을 enum 으로 선언하고 APPROVED 는 없다', () => {
    const allowed = declaredQueryEnum(loadContract(), '/business/sd/quotations', 'status');
    expect([...allowed].sort()).toEqual(['ALL', 'APPROVAL', 'PENDING', 'REJECTED', 'REVIEW']);
  });

  it('화면의 상태 선택지가 전부 계약 enum 안에 있다', () => {
    const allowed = declaredQueryEnum(loadContract(), '/business/sd/quotations', 'status');
    expect(QUOTE_STATUS_OPTIONS.filter((code) => !allowed.includes(code))).toEqual([]);
  });
});
