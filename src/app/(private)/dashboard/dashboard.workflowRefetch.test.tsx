import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as z from 'zod/mini';
import { DASHBOARD_ENDPOINTS } from '@/app/types/api';
import { QUERY_DEFAULTS } from '@/lib/queryClient';
import { useAuthStore } from '@/store/authStore';
import { countRequests } from '@/test/countRequests';
import { mockApi } from '@/test/mockApi';
import { renderWithProviders } from '@/test/render';
import { workflowStatusSchema } from './dashboard.schemas';
import DashboardClient from './DashboardClient';

/** 카드 "날짜가 지나도 같은 데모 데이터" 리뷰 A3. 앱의 staleTime(30초)에서도 처리한 건이 작업 현황에 남지 않는다 */
afterEach(() => useAuthStore.setState({ userInfo: null }));

const firstItem = async () => {
  const body = z.parse(
    z.object({ data: workflowStatusSchema }),
    await mockApi('GET', '/dashboard/workflows'),
  );
  return body.data.tabs[0].items[0];
};
/** 앱과 같은 staleTime. 테스트 클라이언트의 기본값은 0 이라 그냥 두면 늘 다시 받는다 */
const renderDashboard = () => {
  const view = renderWithProviders(<div />);
  view.queryClient.setDefaultOptions({
    queries: { retry: false, gcTime: Infinity, staleTime: QUERY_DEFAULTS.staleTime },
  });
  view.rerender(<DashboardClient />);
  return view;
};

describe('대시보드 작업 현황은 처리한 뒤 다시 받는다', () => {
  it('방금 받은 캐시가 있어도 다른 화면에서 처리하고 돌아오면 그 건이 없다', async () => {
    const before = await firstItem();
    const view = renderDashboard();
    expect(await screen.findByText(before.itemNumber)).toBeInTheDocument();

    // 다른 화면으로 가서 처리한다
    view.rerender(<div />);
    await mockApi('POST', `/business/fcm/invoice/ar/${before.itemId}/receivable/complete`);
    const after = await firstItem();
    expect(after.itemId).not.toBe(before.itemId);

    view.rerender(<DashboardClient />);
    expect(await screen.findByText(after.itemNumber)).toBeInTheDocument();
    expect(screen.queryByText(before.itemNumber)).not.toBeInTheDocument();
  });

  it('대시보드에서 견적을 요청하면 작업 현황을 다시 받는다', async () => {
    useAuthStore.setState({
      userInfo: { id: 1, name: '고객', email: 'a@b.c', role: 'CUSTOMER_ADMIN' },
    });
    const user = userEvent.setup();
    const workflows = countRequests('GET', DASHBOARD_ENDPOINTS.WORKFLOW_STATUS);
    const stats = countRequests('GET', DASHBOARD_ENDPOINTS.STATS);
    renderDashboard();
    await user.click(await screen.findByRole('link', { name: /신규 견적서 작성/ }));
    const product = await screen.findByRole('option', { name: /모터 A/ });
    await user.selectOptions(screen.getByRole('combobox', { name: '제품명 *' }), product);
    expect(workflows()).toBe(1);

    await user.click(screen.getByRole('button', { name: '견적 요청 등록' }));
    expect(await screen.findByText('신규 견적 요청이 등록되었습니다.')).toBeInTheDocument();
    await waitFor(() => expect(workflows()).toBe(2));
    // 통계는 견적 요청과 무관하다
    expect(stats()).toBe(1);
  });
});
