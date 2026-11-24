import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { NextRequest } from 'next/server';
import * as z from 'zod/mini';
import { serveMock } from '@/server/serverMock';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/store/authStore';
import type { Role } from '@/lib/authz/policy';
import { workflowStatusSchema } from './dashboard/dashboard.schemas';
import InvoiceList from './finance/components/tabs/InvoiceList';

const search = vi.hoisted(() => ({ params: '' }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search.params),
}));
afterEach(() => {
  search.params = '';
  useAuthStore.setState({ userInfo: null });
});

/**
 * 카드 "날짜가 지나도 같은 데모 데이터" 리뷰 A1, A2. 대시보드 작업 현황의 전표는 그 역할의 재무 화면이 부르는 목록에 있고
 * 그 화면에서 고를 수 있는(처리할 수 있는) 전표다. 화면을 그 역할로 그려 실제 요청과 체크박스로 본다
 */
const invoiceItem = async (role: Role, tabCode: string) => {
  const request = new NextRequest(`${location.origin}/api/dashboard/workflows`, {
    headers: { 'x-session-role': role },
  });
  const response = await serveMock(request, ['dashboard', 'workflows']);
  const { tabs } = z.parse(z.object({ data: workflowStatusSchema }), await response.json()).data;
  const item = tabs.find((tab) => tab.tabCode === tabCode)?.items.at(0);
  if (!item) throw new Error(`${role} ${tabCode} 탭이 비었다`);
  return item;
};

describe('작업 현황의 전표 = 그 역할의 재무 화면', () => {
  it.each([
    ['SUPPLIER_ADMIN', 'AR', '', '/invoice/ar'],
    ['CUSTOMER_ADMIN', 'AP', '', '/invoice/ap'],
    ['FCM_ADMIN', 'AR', 'tab=sales', '/invoice/ar'],
    ['FCM_ADMIN', 'AP', 'tab=purchase', '/invoice/ap'],
    ['ALL_ADMIN', 'AR', '', '/invoice/ar'],
  ] as const)(
    '%s %s 탭(주소 "%s")의 행을 화면에서 고를 수 있다',
    async (role, tab, params, path) => {
      const item = await invoiceItem(role, tab);
      search.params = params;
      useAuthStore.setState({
        userInfo: { id: 1, name: '관리자', email: 'a@b.c', role },
      });
      const paths: string[] = [];
      const listener = ({ request }: { request: Request }) =>
        paths.push(new URL(request.url).pathname);
      server.events.on('request:start', listener);
      renderWithProviders(<InvoiceList />);
      const box = await screen.findByRole('checkbox', { name: `${item.itemNumber} 선택` });
      server.events.removeListener('request:start', listener);
      expect(box).toBeEnabled();
      expect(paths.some((called) => called.endsWith(path))).toBe(true);
    },
  );
});
