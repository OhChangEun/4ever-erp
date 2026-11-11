import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { API_BASE_URL } from '@/app/types/api';
import { useAuthStore } from '@/store/authStore';
import type { Locale } from '@/i18n/locale';
import DashboardClient from './DashboardClient';
import QuickActions from './components/QuickActions';
import WorkflowStatus from './components/WorkflowStatus';
import SupplyFlow from './components/supplyFlow/SupplyFlow';

const SUPPLY_FLOW_URL = `${API_BASE_URL}/dashboard/supply-flow`;
const replyFlow = (data: unknown) =>
  server.use(
    http.get(SUPPLY_FLOW_URL, () =>
      HttpResponse.json({ status: 200, success: true, message: 'OK', data }),
    ),
  );

// 구매요청 120 중 20 이 반려로 샌다
const LEAKY_FLOW = {
  period: '2026-11',
  nodes: [
    { id: 'a', name: '구매요청', kind: 'flow' },
    { id: 'b', name: '발주', kind: 'flow' },
    { id: 'r', name: '반려', kind: 'drop' },
  ],
  links: [
    { source: 'a', target: 'b', value: 100 },
    { source: 'a', target: 'r', value: 20 },
  ],
};

// 순환이라 시작 금액이 없다
const CYCLIC_FLOW = {
  period: '2026-11',
  nodes: [
    { id: 'a', name: '구매요청', kind: 'flow' },
    { id: 'b', name: '발주', kind: 'flow' },
  ],
  links: [
    { source: 'a', target: 'b', value: 100 },
    { source: 'b', target: 'a', value: 5 },
  ],
};

const loginAs = (role: string) =>
  useAuthStore.getState().setUserInfo({ id: 1, name: 'tester', email: 't@everp.local', role });

describe('대시보드 영어(i18n 4)', () => {
  afterEach(() => {
    useAuthStore.getState().clearUserInfo();
  });

  it('통계 카드 제목이 영어, 직원 수에 단위 "명"이 붙지 않는다', async () => {
    loginAs('MM_ADMIN');
    renderWithProviders(<DashboardClient />, { locale: 'en' });
    const metrics = await screen.findByRole('region', { name: 'Metrics' });
    expect(within(metrics).getByText('Total employees')).toBeInTheDocument();
    expect(within(metrics).getByText('Total sales')).toBeInTheDocument();
    expect(within(metrics).getByText('1,200')).toBeInTheDocument();
    expect(within(metrics).queryByText(/명/)).not.toBeInTheDocument();
  });

  it('한국어 통계 카드는 예전과 같다(직원 수 1,200명)', async () => {
    loginAs('MM_ADMIN');
    renderWithProviders(<DashboardClient />);
    const metrics = await screen.findByRole('region', { name: '지표' });
    expect(within(metrics).getByText('총 직원 수')).toBeInTheDocument();
    expect(within(metrics).getByText('1,200명')).toBeInTheDocument();
  });

  it('빠른 작업 제목과 카드가 영어, 신규 견적서 작성은 모달을 연다', async () => {
    loginAs('CUSTOMER_ADMIN');
    renderWithProviders(<QuickActions />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: 'Quick actions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Edit company info/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: /New quote/ }));
    expect(await screen.findByRole('dialog', { name: 'New quote request' })).toBeInTheDocument();
  });

  it('워크플로우 탭 이름과 빈 목록 안내가 영어, 모르는 탭 코드는 Unknown process', () => {
    renderWithProviders(
      <WorkflowStatus
        workflowData={{
          tabs: [
            { tabCode: 'PO', items: [] },
            { tabCode: 'NOPE', items: [] },
          ],
        }}
      />,
      { locale: 'en' },
    );
    expect(screen.getByRole('heading', { name: 'Workflow status' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Purchase orders' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unknown process' })).toBeInTheDocument();
    expect(screen.getByText('No workflows to show.')).toBeInTheDocument();
  });

  // 게이트웨이 DashboardServiceImpl 이 재고 담당(IM)에게 IN, OUT 탭을 보낸다
  const IM_TABS: [Locale, string, string][] = [
    ['ko', '입고 프로세스', '출고 프로세스'],
    ['en', 'Receiving', 'Shipping'],
  ];
  it.each(IM_TABS)('재고 담당 탭 IN, OUT 이 이름으로 보인다(%s)', (locale, inLabel, outLabel) => {
    renderWithProviders(
      <WorkflowStatus
        workflowData={{
          tabs: [
            { tabCode: 'IN', items: [] },
            { tabCode: 'OUT', items: [] },
          ],
        }}
      />,
      { locale },
    );
    expect(screen.getByRole('button', { name: inLabel })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: outLabel })).toBeInTheDocument();
  });

  it('자재 흐름 카드 제목, 요약, 표, 차트 이름이 영어', async () => {
    replyFlow(LEAKY_FLOW);
    renderWithProviders(<SupplyFlow />, { locale: 'en' });
    const region = await screen.findByRole('region', { name: 'Material flow this month (amount)' });
    const summary = await within(region).findByText(/^By stage:/);
    expect(summary.textContent).toBe(
      'By stage: 구매요청 ₩120, 발주 ₩100. Drop-off (반려) ₩20 (17% of the starting amount).',
    );
    expect(await within(region).findByRole('img', { name: 'Material flow chart' })).toBeVisible();
    await userEvent.click(within(region).getByRole('button', { name: 'Show table' }));
    const table = within(region).getByRole('table', { name: 'Material flow table' });
    expect(within(table).getByRole('columnheader', { name: 'From' })).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'Show chart' })).toBeInTheDocument();
  });

  it('자재 흐름에서 뺀 흐름 수는 영어 복수형', async () => {
    replyFlow({
      period: '2026-11',
      nodes: [{ id: 'a', name: '구매요청', kind: 'flow' }],
      links: [
        { source: 'a', target: 'x', value: 5 },
        { source: 'a', target: 'y', value: 5 },
      ],
    });
    renderWithProviders(<SupplyFlow />, { locale: 'en' });
    await screen.findByText('Excluded 2 unknown flows.');
    expect(screen.getByText('No material flow this month.')).toBeInTheDocument();
  });

  it('한국어 자재 흐름 요약 문장은 예전과 같다', async () => {
    replyFlow(LEAKY_FLOW);
    renderWithProviders(<SupplyFlow />);
    const summary = await screen.findByText(/^단계별 금액:/);
    expect(summary.textContent).toBe(
      '단계별 금액: 구매요청 ₩120, 발주 ₩100. 새는 금액(반려) ₩20(시작 금액의 17%).',
    );
  });

  it('한국어 자재 흐름 요약은 시작 금액이 없으면 그렇게 말한다(예전과 같다)', async () => {
    replyFlow(CYCLIC_FLOW);
    renderWithProviders(<SupplyFlow />);
    const summary = await screen.findByText(/^단계별 금액:/);
    expect(summary.textContent).toBe(
      '단계별 금액: 구매요청 ₩100, 발주 ₩100. 새는 금액 ₩0(시작 금액을 정할 수 없음).',
    );
  });
});
