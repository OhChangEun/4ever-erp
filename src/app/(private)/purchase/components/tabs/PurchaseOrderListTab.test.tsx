import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { http } from 'msw';
import axios from '@/lib/axiosInstance';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { MOCK_SCENARIOS, scenarioResponse, type MockScenario } from '@/mocks/scenario';
import { ERROR_MESSAGE_BY_KIND, type ErrorKind } from '@/lib/AppError';
import { PURCHASE_ENDPOINTS } from '@/app/types/api';
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

const DEFAULT_TIMEOUT = axios.defaults.timeout;

describe('발주서 목록: 실패는 오류로 보이고 빈 목록으로 보이지 않는다', () => {
  afterEach(() => {
    axios.defaults.timeout = DEFAULT_TIMEOUT;
  });

  it('성공하면 발주 번호가 표에 보인다', async () => {
    renderWithProviders(<PurchaseOrderListTab />);
    expect(await screen.findByText('PO-2026-001')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(MOCK_SCENARIOS)(
    '시나리오 %s → role=alert 와 kind 문구, 빈 상태 없음',
    async (scenario) => {
      if (scenario === 'timeout') axios.defaults.timeout = 50;
      server.use(
        http.get(PURCHASE_ENDPOINTS.PURCHASE_ORDERS, () =>
          scenarioResponse(scenario, { delayMs: 300 }),
        ),
      );

      renderWithProviders(<PurchaseOrderListTab />);

      const alert = await screen.findByRole('alert', {}, { timeout: 3000 });
      expect(alert).toHaveTextContent('발주서 목록을 불러오는 중 오류가 발생했습니다.');
      expect(alert).toHaveTextContent(ERROR_MESSAGE_BY_KIND[KIND_OF[scenario]]);
      expect(screen.queryByText('발주서가 없습니다.')).not.toBeInTheDocument();
      expect(screen.queryByText('PO-2026-001')).not.toBeInTheDocument();
    },
  );
});
