import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { NextRequest } from 'next/server';
import * as z from 'zod/mini';
import { serveMock } from '@/server/serverMock';
import { renderWithProviders } from '@/test/render';
import { ROLES } from '@/lib/authz/policy';
import { workflowStatusSchema } from './dashboard.schemas';
import { workflowTabKey } from './dashboard.utils';
import DashboardClient from './DashboardClient';

/**
 * 남은 표시 결함 3 카드. 목이 로그인한 역할에 맞는 워크플로우 탭을 준다.
 * 기대값은 게이트웨이 DashboardServiceImpl.java:56 의 switch(역할 앞 글자) 그대로다.
 * 역할은 x-session-role 헤더로 안다. 서버 목 라우트가 프록시 증명에 든 역할로 이 헤더를 정해 어댑터에 넘긴다
 * (증명 확인과 헤더 덮어쓰기는 `src/app/api/[...slug]/route.test.ts`). 여기서는 어댑터부터 본다.
 */
const tabCodesFor = async (role?: string) => {
  const request = new NextRequest(`${location.origin}/api/dashboard/workflows`, {
    headers: role ? { 'x-session-role': role } : {},
  });
  const response = await serveMock(request, ['dashboard', 'workflows']);
  const body = z.parse(z.object({ data: workflowStatusSchema }), await response.json());
  return body.data.tabs.map((tab) => tab.tabCode);
};

describe('대시보드 워크플로우 목은 역할별 탭을 준다', () => {
  it.each([
    ['SUPPLIER_ADMIN', ['PO', 'AR']],
    ['CUSTOMER_ADMIN', ['QT', 'AP']],
    ['MM_USER', ['PO', 'SO']],
    ['MM_ADMIN', ['PO', 'SO']],
    ['SD_ADMIN', ['QT', 'SO']],
    ['FCM_ADMIN', ['AR', 'AP']],
    ['IM_ADMIN', ['IN', 'OUT']],
    ['HRM_ADMIN', ['ATT', 'LV']],
    ['PP_ADMIN', ['QT', 'MES']],
    ['ALL_ADMIN', ['AR', 'AP']],
    ['NOT_A_ROLE', ['AR', 'AP']],
    [undefined, ['AR', 'AP']],
  ])('%s → %j', async (role, expected) => {
    expect(await tabCodesFor(role)).toEqual(expected);
  });

  it.each(ROLES)('%s 의 탭 코드는 모두 메시지 표에 있다', async (role) => {
    const codes = await tabCodesFor(role);
    expect(codes).toHaveLength(2);
    expect(codes.map(workflowTabKey)).not.toContain('unknown');
  });
});

describe('대시보드 화면', () => {
  it.each([
    { locale: 'ko', tabs: ['매출 프로세스', '매입 프로세스'], unknown: '알 수 없는 프로세스' },
    { locale: 'en', tabs: ['Receivables', 'Payables'], unknown: 'Unknown process' },
  ] as const)('$locale: 탭 두 개에 이름이 붙는다', async ({ locale, tabs, unknown }) => {
    renderWithProviders(<DashboardClient />, { locale });
    for (const name of tabs) {
      expect(await screen.findByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: unknown })).not.toBeInTheDocument();
  });
});
