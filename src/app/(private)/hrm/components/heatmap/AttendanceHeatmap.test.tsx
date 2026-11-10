import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { renderWithProviders } from '@/test/render';
import { API_BASE_URL } from '@/app/types/api';
import { toDateKey } from '@/app/utils/date';
import AttendanceHeatmap from './AttendanceHeatmap';

const URL = `${API_BASE_URL}/business/hrm/attendance/daily-summary`;

describe('근태 heatmap(시각화 5)', () => {
  it('요약 문장이 잔디의 설명이고, 칸마다 날짜와 내역 title 이 있다', async () => {
    renderWithProviders(<AttendanceHeatmap selectedDate={null} onSelect={() => {}} />);
    const summary = await screen.findByText(/근태 이상\(지각 \+ 결근\) 하루 평균/);
    const img = screen.getByRole('img', { name: '근태 이상 잔디(12주)' });
    expect(img).toHaveAttribute('aria-describedby', summary.id);
    expect(img.querySelectorAll('rect[data-date]').length).toBeGreaterThan(50);
    expect(img.querySelector('rect[data-date] title')?.textContent).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('칸을 누르면 그 날짜로 onSelect, 고른 날은 표시된다', async () => {
    const onSelect = vi.fn();
    const { rerender } = renderWithProviders(
      <AttendanceHeatmap selectedDate={null} onSelect={onSelect} />,
    );
    await screen.findByRole('img', { name: '근태 이상 잔디(12주)' });
    const today = toDateKey(new Date());
    const cell = document.querySelector(`rect[data-date="${today}"]`);
    if (!cell) throw new Error('오늘 칸이 없다');
    await userEvent.click(cell);
    expect(onSelect).toHaveBeenCalledWith(today);
    rerender(<AttendanceHeatmap selectedDate={today} onSelect={onSelect} />);
    expect(document.querySelector(`rect[data-date="${today}"]`)).toHaveAttribute(
      'data-selected',
      'true',
    );
  });

  it('불러오지 못하면 오류를 보인다', async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json({ status: 500, success: false, message: 'x' }, { status: 500 }),
      ),
    );
    renderWithProviders(<AttendanceHeatmap selectedDate={null} onSelect={() => {}} />);
    await waitFor(() =>
      expect(screen.getByText('근태 잔디를 불러오지 못했습니다.')).toBeInTheDocument(),
    );
  });

  it('기록이 없으면 잔디를 그리지 않는다', async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json({
          status: 200,
          success: true,
          message: 'OK',
          data: { from: '2026-08-24', to: '2026-11-11', days: [] },
        }),
      ),
    );
    renderWithProviders(<AttendanceHeatmap selectedDate={null} onSelect={() => {}} />);
    await screen.findByText('최근 12주 근태 기록이 없습니다.');
    expect(screen.queryByRole('img', { name: '근태 이상 잔디(12주)' })).not.toBeInTheDocument();
  });
});
