import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { API_BASE_URL } from '@/app/types/api';
import SupplyFlow from './SupplyFlow';

const URL = `${API_BASE_URL}/dashboard/supply-flow`;
const reply = (data: unknown) =>
  server.use(
    http.get(URL, () => HttpResponse.json({ status: 200, success: true, message: 'OK', data })),
  );

describe('공급망 흐름(시각화 6)', () => {
  it('요약 문장과 표로 보기(흐름 수만큼 행)', async () => {
    renderWithProviders(<SupplyFlow />);
    const region = await screen.findByRole('region', { name: '이번 달 자재 흐름(금액)' });
    const summary = await within(region).findByText(/새는 금액/);
    expect(within(region).getByRole('img', { name: '자재 흐름 차트' })).toHaveAttribute(
      'aria-describedby',
      summary.id,
    );
    await userEvent.click(within(region).getByRole('button', { name: '표로 보기' }));
    const table = within(region).getByRole('table', { name: '자재 흐름 표' });
    expect(table.querySelectorAll('tbody tr').length).toBeGreaterThan(4);
  });

  it('모르는 노드를 가리키는 흐름은 빼고 알린다', async () => {
    reply({
      period: '2026-11',
      nodes: [
        { id: 'a', name: '구매요청', kind: 'flow' },
        { id: 'b', name: '발주', kind: 'flow' },
      ],
      links: [
        { source: 'a', target: 'b', value: 100 },
        { source: 'a', target: 'x', value: 5 },
      ],
    });
    renderWithProviders(<SupplyFlow />);
    await screen.findByText('알 수 없는 흐름 1건은 뺐습니다.');
  });

  it('순환이 있으면 차트 대신 표만 보인다', async () => {
    reply({
      period: '2026-11',
      nodes: [
        { id: 'a', name: '구매요청', kind: 'flow' },
        { id: 'b', name: '발주', kind: 'flow' },
      ],
      links: [
        { source: 'a', target: 'b', value: 100 },
        { source: 'b', target: 'a', value: 5 },
      ],
    });
    renderWithProviders(<SupplyFlow />);
    await screen.findByText(/흐름이 되돌아가는 구간이 있어 차트로 그리지 않았습니다/);
    expect(screen.queryByRole('img', { name: '자재 흐름 차트' })).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: '자재 흐름 표' })).toBeInTheDocument();
  });

  it('불러오지 못하면 오류를 보인다', async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json({ status: 500, success: false, message: 'x' }, { status: 500 }),
      ),
    );
    renderWithProviders(<SupplyFlow />);
    await screen.findByText('자재 흐름을 불러오지 못했습니다.');
  });

  it('흐름이 없으면 그리지 않는다', async () => {
    reply({ period: '2026-11', nodes: [], links: [] });
    renderWithProviders(<SupplyFlow />);
    await screen.findByText('이번 달 자재 흐름이 없습니다.');
  });
});
