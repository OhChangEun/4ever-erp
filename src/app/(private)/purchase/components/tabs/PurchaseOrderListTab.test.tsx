import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { AxiosError, type AxiosAdapter } from 'axios';
import axios from '@/lib/axiosInstance';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { MOCK_SCENARIOS, scenarioResponse, type MockScenario } from '@/mocks/scenario';
import { ERROR_MESSAGE_BY_KIND, type ErrorKind } from '@/lib/AppError';
import { PURCHASE_ENDPOINTS } from '@/app/(private)/purchase/api/purchase.endpoints';
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
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
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
          expect(alert).toHaveTextContent(ERROR_MESSAGE_BY_KIND[KIND_OF[scenario]]);
        },
        { timeout: 3000 },
      );
      expect(screen.queryByText('발주서가 없습니다.')).not.toBeInTheDocument();
      expect(screen.queryByText('PO-2026-001')).not.toBeInTheDocument();
    },
  );
});
