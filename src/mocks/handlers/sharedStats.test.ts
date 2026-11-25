// @vitest-environment node
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import {
  API_BASE_URL,
  DASHBOARD_ENDPOINTS,
  FINANCE_ENDPOINTS,
  SALES_ENDPOINTS,
} from '@/app/types/api';
import { HRM_ENDPOINTS } from '@/app/(private)/hrm/api/hrm.endpoints';
import { PURCHASE_ENDPOINTS } from '@/app/(private)/purchase/api/purchase.endpoints';
import { mockApi } from '@/test/mockApi';

/**
 * 카드 "지표 증감과 일괄 확정". 같은 지표는 어느 화면에서나 값, 증감률, 추이가 같다(예전엔 지표 이름으로 증감률을 정해
 * 총 직원 수가 대시보드 +21.2%, 인사 -9.1% 였다).
 */
const StatsSchema = z.record(z.string(), z.record(z.string(), z.unknown()));
const PERIODS = ['week', 'month', 'quarter', 'year'] as const;
const statOf = async (url: string, name: string, auth = '') => {
  const path = url.slice(API_BASE_URL.length);
  const { data } = z.object({ data: StatsSchema }).parse(await mockApi('GET', path, { auth }));
  return PERIODS.map((period) => data[period][name]);
};

describe('같은 지표는 화면마다 같은 값, 증감률, 추이다', () => {
  it.each([
    ['재무 매출', FINANCE_ENDPOINTS.STATISTICS, 'total_sales', 'total_sales'],
    ['영업 매출', SALES_ENDPOINTS.STATS, 'sales_amount', 'total_sales'],
    ['재무 매입', FINANCE_ENDPOINTS.STATISTICS, 'total_purchases', 'total_purchases'],
    ['구매 매입', PURCHASE_ENDPOINTS.STATISTICS, 'purchaseOrderAmount', 'total_purchases'],
    ['재무 순이익', FINANCE_ENDPOINTS.STATISTICS, 'net_profit', 'net_profit'],
    ['인사 직원 수', HRM_ENDPOINTS.STATISTICS, 'totalEmployeeCount', 'total_employees'],
  ])('%s = 대시보드', async (_, url, name, dashboardName) => {
    const stats = await statOf(url, name);
    expect(stats.every(Boolean)).toBe(true);
    expect(stats).toEqual(await statOf(DASHBOARD_ENDPOINTS.STATS, dashboardName));
  });

  it('직원을 등록하면 인사와 대시보드 직원 수가 같이 는다', async () => {
    const auth = 'Bearer headcount';
    const count = async () => [
      await statOf(HRM_ENDPOINTS.STATISTICS, 'totalEmployeeCount', auth),
      await statOf(DASHBOARD_ENDPOINTS.STATS, 'total_employees', auth),
    ];
    const [before] = await count();
    await mockApi('POST', '/business/hrm/employee/signup', {
      auth,
      body: {
        name: '새직원',
        departmentId: 'dept-001',
        positionId: 'pos-002',
        email: 'new@everp.co.kr',
        phoneNumber: '010-0000-0000',
        hireDate: '2026-11-25',
        birthDate: '2000-01-01',
        gender: 'MALE',
        address: '서울',
      },
    });
    const [hrm, dashboard] = await count();
    expect(hrm).toEqual(dashboard);
    expect(hrm[0]).toMatchObject({ value: 41 });
    expect(before[0]).toMatchObject({ value: 40 });
  });
});
