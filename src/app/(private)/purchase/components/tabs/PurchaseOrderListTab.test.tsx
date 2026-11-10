import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from '@/store/authStore';
import { delay, HttpResponse } from 'msw';
import { ok } from '@/mocks/utils';
import { http } from 'msw';
import { AxiosError, type AxiosAdapter } from 'axios';
import axios from '@/lib/axiosInstance';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { MOCK_SCENARIOS, scenarioResponse, type MockScenario } from '@/mocks/scenario';
import type { ErrorKind } from '@/lib/AppError';
import ko from '@/i18n/messages/ko.json';
import {
  PURCHASE_BASE_PATH,
  PURCHASE_ENDPOINTS,
} from '@/app/(private)/purchase/api/purchase.endpoints';
import PurchaseOrderListTab from './PurchaseOrderListTab';

const KIND_OF: Record<MockScenario, ErrorKind> = {
  network: 'network',
  timeout: 'timeout',
  '401': 'unauthorized',
  '403': 'forbidden',
  '404': 'notFound',
  '409': 'conflict',
  '500': 'server',
  shape: 'invalidShape',
};

const DEFAULT_ADAPTER = axios.defaults.adapter;

// jsdom + MSW 는 XHR timeout 을 흉내 내지 못한다(응답을 늦출 수는 있어도 끊지 않는다).
// 그래서 timeout 만 axios 어댑터를 바꿔, axios 가 실제 타임아웃 때 던지는 오류 모양을 그대로 낸다.
const timeoutAdapter: AxiosAdapter = (config) =>
  Promise.reject(new AxiosError('timeout of 4000ms exceeded', AxiosError.ECONNABORTED, config));

describe('발주서 목록: 실패는 오류로 보이고 빈 목록으로 보이지 않는다', () => {
  afterEach(() => {
    axios.defaults.adapter = DEFAULT_ADAPTER;
  });

  it('성공하면 발주 번호가 표에 보인다', async () => {
    renderWithProviders(<PurchaseOrderListTab />);
    // 옵션 로드 뒤 쿼리 키가 한 번 더 바뀌므로 로딩이 완전히 끝난 상태를 기다린다.
    await waitFor(
      () => {
        // 로딩 표시(TableStatusBox). 토스트 알림 영역도 status 라 글자로 특정한다
        expect(screen.queryByText(/불러오는 중/)).not.toBeInTheDocument();
        expect(screen.getByText('PO-2026-001')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(MOCK_SCENARIOS)(
    '시나리오 %s → role=alert 와 kind 문구, 빈 상태 없음',
    async (scenario) => {
      if (scenario === 'timeout') {
        axios.defaults.adapter = timeoutAdapter;
      } else {
        server.use(http.get(PURCHASE_ENDPOINTS.PURCHASE_ORDERS, () => scenarioResponse(scenario)));
      }

      renderWithProviders(<PurchaseOrderListTab />);

      // 옵션 드롭다운이 로드되면 SearchBar 가 검색 타입을 바꿔 쿼리 키가 한 번 더 바뀐다.
      // 같은 DOM 노드가 로딩 → 오류로 다시 바뀌므로, 두 문구가 동시에 맞을 때까지 기다린다.
      await waitFor(
        () => {
          const alert = screen.getByRole('alert');
          expect(alert).toHaveTextContent('발주서 목록을 불러오는 중 오류가 발생했습니다.');
          expect(alert).toHaveTextContent(ko.errors[KIND_OF[scenario]]);
        },
        { timeout: 3000 },
      );
      expect(screen.queryByText('발주서가 없습니다.')).not.toBeInTheDocument();
      expect(screen.queryByText('PO-2026-001')).not.toBeInTheDocument();
    },
  );
});

describe('발주 승인 중복 제출 방지', () => {
  afterEach(() => {
    useAuthStore.getState().clearUserInfo();
    vi.restoreAllMocks();
  });

  it('승인 버튼을 빠르게 두 번 눌러도 요청은 한 번, 진행 중엔 버튼이 잠긴다', async () => {
    // 승인 버튼은 공급사 역할 + PENDING 상태에서만 보인다
    useAuthStore.getState().setUserInfo({
      id: 2,
      name: '대양상사',
      email: 'supplier@everp.local',
      role: 'SUPPLIER_ADMIN',
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    let approveCalls = 0;
    let listCalls = 0;
    server.use(
      http.get(PURCHASE_ENDPOINTS.PURCHASE_ORDERS, () => {
        listCalls += 1;
        return ok({
          content: [
            {
              purchaseOrderId: 'po-001',
              purchaseOrderNumber: 'PO-2026-001',
              supplierName: '대양상사',
              itemsSummary: '원자재 A 외 2건',
              orderDate: '2026-01-08',
              dueDate: '2026-01-30',
              totalAmount: 4200000,
              statusCode: 'PENDING',
            },
          ],
          page: { number: 0, size: 10, totalElements: 1, totalPages: 1, hasNext: false },
        });
      }),
      http.post(`${PURCHASE_BASE_PATH}/purchase-orders/:poId/approve`, async () => {
        approveCalls += 1;
        await delay(200);
        return HttpResponse.json({ status: 200, success: true, message: 'OK', data: null });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<PurchaseOrderListTab />);
    // 옵션 로드 뒤 검색 타입이 바뀌며 목록을 한 번 더 가져온다(두 번째 요청). 그 뒤의 표를 잡아야 한다.
    await waitFor(
      () => {
        expect(listCalls).toBeGreaterThanOrEqual(2);
        expect(screen.queryByText(/불러오는 중입니다/)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '승인' })).toBeEnabled();
      },
      { timeout: 3000 },
    );
    const approve = screen.getByRole('button', { name: '승인' });

    await user.click(approve);
    await user.click(approve); // 두 번째 클릭. 버튼이 잠겨 있거나 안전망이 버려야 한다
    expect(screen.getByRole('button', { name: '승인' })).toBeDisabled();

    await waitFor(() => expect(screen.getByRole('button', { name: '승인' })).toBeEnabled(), {
      timeout: 3000,
    });
    expect(approveCalls).toBe(1);
  });
});

describe('발주 목록 페이지 전환', () => {
  it('다음 페이지를 받는 동안 이전 행을 흐리게 남기고 로딩 상자를 보이지 않는다', async () => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const row = (n: number) => ({
      purchaseOrderId: `po-${n}`,
      purchaseOrderNumber: `PO-PAGE-${n}`,
      supplierName: '대양상사',
      itemsSummary: '원자재',
      orderDate: '2026-01-08',
      dueDate: '2026-01-30',
      totalAmount: 1000,
      statusCode: 'APPROVAL',
    });
    server.use(
      http.get(PURCHASE_ENDPOINTS.PURCHASE_ORDERS, async ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page') ?? 0);
        if (page === 1) await held;
        return ok({
          content: [row(page)],
          page: { number: page, size: 10, totalElements: 20, totalPages: 2, hasNext: page === 0 },
        });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<PurchaseOrderListTab />);
    // 옵션이 로드되면 검색 타입이 바뀌어 키가 한 번 더 바뀐다. 그것까지 끝난 안정 상태를 기다린다
    await waitFor(
      () => {
        expect(screen.queryByText(/불러오는 중입니다/)).not.toBeInTheDocument();
        expect(screen.getByText('PO-PAGE-0')).toBeInTheDocument();
        expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy');
        expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    await user.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true'));
    expect(screen.getByText('PO-PAGE-0')).toBeInTheDocument();
    expect(screen.queryByText(/불러오는 중입니다/)).not.toBeInTheDocument();

    release();
    expect(await screen.findByText('PO-PAGE-1')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy'));
  });
});
