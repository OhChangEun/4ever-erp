import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { ok, makePage } from '@/mocks/utils';
import { PRODUCTION_ENDPOINTS } from '@/app/(private)/production/api/production.endpoints';
import MpsTab from './MpsTab';

/**
 * 남은 표시 결함 3 카드. MPS 수량 네 칸은 비어 와도 탭을 막지 않고 그 칸만 `-` 로 보인다.
 * 0 은 서버가 준 값이라 0 그대로다(빈 값을 0 으로 바꾸지 않는다).
 */
const serveWeek = (week: Record<string, unknown>) =>
  server.use(
    http.get(PRODUCTION_ENDPOINTS.MPS_TOGGLE_PRODUCTS, () =>
      ok([{ key: 'bom-001', value: '모터 A' }]),
    ),
    http.get(PRODUCTION_ENDPOINTS.MPS_PLANS, () =>
      ok({
        bomId: 'bom-001',
        productName: '모터 A',
        content: [{ week: '2026-01-1W', ...week }],
        page: makePage(0, 10, 1),
      }),
    ),
  );

const cellTexts = async () => {
  const row = (await screen.findByText('2026-01-1W')).closest('tr');
  if (!row) throw new Error('MPS 행이 없다');
  return within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent);
};

describe('MPS 수량 빈 값', () => {
  it('null 인 칸만 - 로 보이고 나머지는 값 그대로', async () => {
    serveWeek({
      demand: null,
      requiredInventory: 20,
      productionNeeded: null,
      plannedProduction: 90,
    });
    renderWithProviders(<MpsTab />);
    expect(await cellTexts()).toEqual(['모터 A', '2026-01-1W', '-', '20', '-', '90']);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('키가 없는 칸도 - 로 보인다', async () => {
    serveWeek({ demand: 100 });
    renderWithProviders(<MpsTab />);
    expect(await cellTexts()).toEqual(['모터 A', '2026-01-1W', '100', '-', '-', '-']);
  });

  it('0 은 0 으로 보인다', async () => {
    serveWeek({ demand: 0, requiredInventory: 0, productionNeeded: 0, plannedProduction: 0 });
    renderWithProviders(<MpsTab />);
    expect(await cellTexts()).toEqual(['모터 A', '2026-01-1W', '0', '0', '0', '0']);
  });
});
