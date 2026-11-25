import { afterEach, beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement } from 'react';
import { delay, http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/store/authStore';
import { INVENTORY_ENDPOINTS, SALES_ENDPOINTS } from '@/app/types/api';
import { PRODUCTION_ENDPOINTS } from './production/api/production.endpoints';
import { PURCHASE_ENDPOINTS } from './purchase/api/purchase.endpoints';
import InventoryList from './inventory/components/tabs/InventoryList';
import PurchaseRequestListTab from './purchase/components/tabs/PurchaseRequestListTab';
import PurchaseOrderListTab from './purchase/components/tabs/PurchaseOrderListTab';
import MesTab from './production/components/tabs/MesTab';
import OrdersTab from './production/components/tabs/OrdersTab';
import SalesQuoteList from './sales/components/tabs/SalesQuoteList';

/**
 * 카드 "화면끼리 캐시" 완료 기준 4. 처음 값이 화면이 자동으로 고르는 첫 항목과 다르면 키가 바뀌어 같은 목록을 두 번 받는다.
 * 검색어를 넣으면 화면에 보이는 검색 타입이 그대로 간다.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));
// jsdom 에는 scrollTo 가 없다. MES 표가 진행 중 공정으로 가로 스크롤한다
beforeAll(() => {
  Element.prototype.scrollTo = () => {};
});
afterEach(() => useAuthStore.setState({ userInfo: null }));

/** 이 목록으로 나간 GET 의 쿼리 문자열 */
const watch = (endpoint: string) => {
  const pathname = new URL(endpoint, 'http://localhost').pathname;
  const seen: URLSearchParams[] = [];
  const listener = ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === pathname) seen.push(url.searchParams);
  };
  server.events.on('request:start', listener);
  onTestFinished(() => {
    server.events.removeListener('request:start', listener);
  });
  return seen;
};

/** 목록이 보이고 자동 선택과 검색 디바운스(200ms) 뒤의 요청까지 끝날 때까지 */
const settled = async () => {
  expect((await screen.findAllByRole('row', undefined, { timeout: 3000 })).length).toBeGreaterThan(
    1,
  );
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
};

const LISTS: {
  name: string;
  endpoint: string;
  list: ReactElement;
  keyword?: string;
  type?: string;
}[] = [
  {
    name: '재고',
    endpoint: INVENTORY_ENDPOINTS.INVENTORY_LIST,
    list: <InventoryList />,
    keyword: '창고',
    type: 'WAREHOUSE_NAME',
  },
  {
    name: '구매 요청',
    endpoint: PURCHASE_ENDPOINTS.PURCHASE_REQUESTS,
    list: <PurchaseRequestListTab />,
    keyword: 'PR-2026-015',
    type: 'NUMBER',
  },
  {
    name: '발주',
    endpoint: PURCHASE_ENDPOINTS.PURCHASE_ORDERS,
    list: <PurchaseOrderListTab />,
    keyword: 'PO-',
    type: 'NUMBER',
  },
  { name: 'MES', endpoint: PRODUCTION_ENDPOINTS.MES_LIST, list: <MesTab /> },
  { name: 'MRP 순소요', endpoint: PRODUCTION_ENDPOINTS.MRP_ORDERS, list: <OrdersTab /> },
  // 대조군. 처음 값이 첫 항목과 같아 예전부터 한 번이다
  {
    name: '영업 견적',
    endpoint: SALES_ENDPOINTS.QUOTES_LIST,
    list: <SalesQuoteList />,
    keyword: 'QT-',
    type: 'quotationNumber',
  },
];

describe('목록은 한 번 들어갈 때 한 번 받는다', () => {
  it.each(LISTS)('$name', async ({ endpoint, list }) => {
    const seen = watch(endpoint);
    renderWithProviders(list);
    await settled();
    expect(seen.map(String)).toHaveLength(1);
  });
});

describe('검색어를 넣으면 화면에 보이는 검색 타입이 간다', () => {
  it.each(LISTS.filter(({ keyword }) => keyword))(
    '$name → $type',
    async ({ endpoint, list, keyword = '', type }) => {
      const user = userEvent.setup();
      const seen = watch(endpoint);
      renderWithProviders(list);
      await settled();
      await user.type(screen.getByPlaceholderText(/검색/), keyword);
      await waitFor(() => expect(seen.at(-1)?.get('keyword')).toBe(keyword));
      expect(seen.at(-1)?.get('type')).toBe(type);
    },
  );
});

describe('구매 목록은 검색어가 없으면 검색 타입을 보내지 않는다', () => {
  it.each(LISTS.filter(({ name }) => name === '구매 요청' || name === '발주'))(
    '$name',
    async ({ endpoint, list }) => {
      const seen = watch(endpoint);
      renderWithProviders(list);
      await settled();
      expect(seen.map((params) => params.has('type'))).toEqual([false]);
    },
  );
});

describe('처음 값은 화면에 보이는 첫 항목이다', () => {
  it('재고 목록의 첫 요청은 창고명으로 간다', async () => {
    const seen = watch(INVENTORY_ENDPOINTS.INVENTORY_LIST);
    renderWithProviders(<InventoryList />);
    await settled();
    expect(seen[0].get('type')).toBe('WAREHOUSE_NAME');
  });

  const QUOTE_LISTS = [
    { name: 'MES', endpoint: PRODUCTION_ENDPOINTS.MES_LIST, list: <MesTab /> },
    { name: 'MRP 순소요', endpoint: PRODUCTION_ENDPOINTS.MRP_ORDERS, list: <OrdersTab /> },
  ];
  it.each(QUOTE_LISTS)(
    '$name: 첫 옵션이 전체면 견적 없이 한 번 받고 화면에는 전체가 보인다',
    async ({ endpoint, list }) => {
      const seen = watch(endpoint);
      renderWithProviders(list);
      await settled();
      expect(seen.map((params) => params.get('quotationId'))).toEqual([null]);
      expect(screen.getByRole('combobox', { name: '견적 선택' })).toHaveTextContent('전체 견적');
    },
  );

  // 리뷰: 서버 옵션에 ALL 이 없으면 서버가 준 첫 견적으로 다시 받는다(예전과 같은 값, 같은 두 번)
  it.each(QUOTE_LISTS)(
    '$name: 옵션에 전체가 없으면 첫 견적으로 다시 받는다',
    async ({ endpoint, list }) => {
      server.use(
        http.get(PRODUCTION_ENDPOINTS.MRP_QUOTATION_DROPDOWN, () =>
          HttpResponse.json({
            status: 200,
            success: true,
            message: 'OK',
            data: [
              { key: 'qt-002', value: 'QT-2026-002' },
              { key: 'qt-003', value: 'QT-2026-003' },
            ],
          }),
        ),
      );
      const seen = watch(endpoint);
      renderWithProviders(list);
      await settled();
      expect(seen.map((params) => params.get('quotationId'))).toEqual([null, 'qt-002']);
      expect(screen.getByRole('combobox', { name: '견적 선택' })).toHaveTextContent('QT-2026-002');
    },
  );

  // 옵션을 못 받아도 목록은 멈추지 않는다(예전처럼 견적 없이 받는다)
  it.each(QUOTE_LISTS)(
    '$name: 옵션을 못 받으면 견적 없이 한 번 받는다',
    async ({ endpoint, list }) => {
      server.use(
        http.get(PRODUCTION_ENDPOINTS.MRP_QUOTATION_DROPDOWN, () =>
          HttpResponse.json({ status: 500, success: false, message: 'x' }, { status: 500 }),
        ),
      );
      const seen = watch(endpoint);
      renderWithProviders(list);
      await settled();
      expect(seen.map((params) => params.get('quotationId'))).toEqual([null]);
    },
  );

  // 재리뷰: 옵션이 늦게 와서 실제 견적을 고르면 첫 쪽으로 돌아간다(그 견적에 없는 쪽에 머물지 않게)
  it('MES: 2쪽에 있을 때 늦은 옵션이 견적을 고르면 1쪽을 다시 받는다', async () => {
    let release: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(PRODUCTION_ENDPOINTS.MRP_QUOTATION_DROPDOWN, async () => {
        await ready;
        return HttpResponse.json({
          status: 200,
          success: true,
          message: 'OK',
          data: [{ key: 'qt-002', value: 'QT-2026-002' }],
        });
      }),
    );
    const user = userEvent.setup();
    const seen = watch(PRODUCTION_ENDPOINTS.MES_LIST);
    renderWithProviders(<MesTab />);
    await settled();
    await user.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(seen.at(-1)?.get('page')).toBe('1'));
    release();
    await waitFor(() => expect(seen.at(-1)?.get('quotationId')).toBe('qt-002'));
    expect(seen.at(-1)?.get('page')).toBe('0');
  });

  // 재리뷰: 옵션이 느려도 목록은 기다리지 않는다
  it.each(QUOTE_LISTS)(
    '$name: 옵션 응답이 오지 않아도 목록이 보인다',
    async ({ endpoint, list }) => {
      server.use(
        http.get(PRODUCTION_ENDPOINTS.MRP_QUOTATION_DROPDOWN, async () => {
          await delay('infinite');
          return HttpResponse.json({});
        }),
      );
      const seen = watch(endpoint);
      renderWithProviders(list);
      await settled();
      expect(seen).toHaveLength(1);
    },
  );
});
