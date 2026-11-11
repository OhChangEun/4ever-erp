import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { SALES_ENDPOINTS } from '@/app/types/api';
import type { Locale } from '@/i18n/locale';
import ko from '@/i18n/messages/ko.json';
import en from '@/i18n/messages/en.json';
import salesKo from '@/i18n/messages/sales/ko.json';
import salesEn from '@/i18n/messages/sales/en.json';
import SalesChart from './SalesChart';

/**
 * 영업 매출 분석 실패 카드(2026-11-11). 조회가 실패하면 빈 상태("데이터가 없습니다")가 아니라
 * 오류를 보인다. 빈 상태는 성공 응답이 정말 비었을 때만.
 */
const ok = (data: unknown) =>
  HttpResponse.json({ status: 200, success: true, message: 'OK', data });

const emptyAnalytics = {
  period: {
    start: '2026-01-01',
    end: '2026-01-31',
    weekStart: '2026-01-01',
    weekEnd: '2026-01-07',
    weekCount: 0,
  },
  trend: [],
  trendScale: { sale: { min: 0, max: 0 }, orderCount: { min: 0, max: 0 } },
  productShare: [],
  topCustomers: [],
};

const locales: readonly Locale[] = ['ko', 'en'];

describe.each(locales)('매출 분석 실패와 빈 상태 (%s)', (locale) => {
  const common = locale === 'ko' ? ko : en;
  const chart = (locale === 'ko' ? salesKo : salesEn).chart;
  const emptyTexts = [chart.trendEmpty, chart.productEmpty, chart.customerEmpty];

  it('500 이면 오류를 보이고 빈 상태 문구는 보이지 않는다', async () => {
    server.use(
      http.get(SALES_ENDPOINTS.ANALYTICS, () =>
        HttpResponse.json({ status: 500, success: false, message: 'boom' }, { status: 500 }),
      ),
    );
    renderWithProviders(<SalesChart />, { locale });
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(chart.loadError)).toBeInTheDocument();
    expect(within(alert).getByText(common.errors.server)).toBeInTheDocument();
    for (const text of emptyTexts) expect(screen.queryByText(text)).not.toBeInTheDocument();
  });

  it('응답 형식이 틀리면 형식 오류를 보인다(빈 상태로 숨기지 않는다)', async () => {
    server.use(http.get(SALES_ENDPOINTS.ANALYTICS, () => ok({ trend: 'x' })));
    renderWithProviders(<SalesChart />, { locale });
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(chart.loadError)).toBeInTheDocument();
    expect(within(alert).getByText(common.errors.invalidShape)).toBeInTheDocument();
    for (const text of emptyTexts) expect(screen.queryByText(text)).not.toBeInTheDocument();
  });

  it('성공했지만 비어 있으면 빈 상태를 보이고 오류는 없다', async () => {
    server.use(http.get(SALES_ENDPOINTS.ANALYTICS, () => ok(emptyAnalytics)));
    const { queryClient } = renderWithProviders(<SalesChart />, { locale });
    // 조회가 성공으로 끝난 뒤를 본다
    await waitFor(() =>
      expect(
        queryClient
          .getQueryCache()
          .getAll()
          .map((query) => query.state.status),
      ).toEqual(['success']),
    );
    for (const text of emptyTexts) expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(chart.loadError)).not.toBeInTheDocument();
  });

  it('로딩 중에는 로딩 표시만 보이고 빈 문구는 없다', async () => {
    let release = () => {};
    const answered = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(SALES_ENDPOINTS.ANALYTICS, async () => {
        await answered;
        return ok(emptyAnalytics);
      }),
    );
    renderWithProviders(<SalesChart />, { locale });
    // 토스트 영역도 status 라 로딩 문구가 든 것을 고른다
    const loading = await screen.findByText(chart.loading);
    expect(screen.getAllByRole('status').some((region) => region.contains(loading))).toBe(true);
    for (const text of emptyTexts) expect(screen.queryByText(text)).not.toBeInTheDocument();
    release();
    expect(await screen.findByText(chart.trendEmpty)).toBeInTheDocument();
    expect(screen.queryByText(chart.loading)).not.toBeInTheDocument();
  });

  it('데이터를 보인 뒤 다시 받기가 실패하면 차트 대신 오류 상자로 바뀐다(옛 값을 말없이 두지 않는다)', async () => {
    const { queryClient } = renderWithProviders(<SalesChart />, { locale });
    // 기본 목의 제품명. 처음 조회는 성공한다
    expect(await screen.findByText('모터 A')).toBeInTheDocument();
    server.use(
      http.get(SALES_ENDPOINTS.ANALYTICS, () =>
        HttpResponse.json({ status: 500, success: false, message: 'boom' }, { status: 500 }),
      ),
    );
    await queryClient.refetchQueries();
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(chart.loadError)).toBeInTheDocument();
    expect(screen.queryByText('모터 A')).not.toBeInTheDocument();
  });
});
