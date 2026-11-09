import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarButton from './CalendarButton';

// 한국 시간(UTC+9). 자정 날짜를 UTC 로 바꾸면 전날이 되는 결함을 잡으려고 고정한다
beforeAll(() => vi.stubEnv('TZ', 'Asia/Seoul'));
afterAll(() => vi.unstubAllEnvs());

const openCalendar = async (label: string) => {
  await userEvent.click(screen.getByRole('button', { name: label }));
  return screen.getByRole('dialog');
};

describe('CalendarButton', () => {
  it('고른 날짜를 YYYY-MM-DD 로 넘긴다(한국 시간에서도 전날이 되지 않는다)', async () => {
    const onDateChange = vi.fn();
    render(<CalendarButton selectedDate="2026-11-01" onDateChange={onDateChange} />);
    const dialog = await openCalendar('2026-11-01');
    await userEvent.click(within(dialog).getByRole('button', { name: /11월 10일/ }));
    expect(onDateChange).toHaveBeenCalledWith('2026-11-10');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('이전 달, 다음 달로 넘긴다', async () => {
    render(<CalendarButton selectedDate="2026-11-15" onDateChange={vi.fn()} />);
    const dialog = await openCalendar('2026-11-15');
    expect(within(dialog).getByText('2026년 11월')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '다음 달' }));
    expect(within(dialog).getByText('2026년 12월')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '이전 달' }));
    await userEvent.click(within(dialog).getByRole('button', { name: '이전 달' }));
    expect(within(dialog).getByText('2026년 10월')).toBeInTheDocument();
  });

  it('초기화하면 null', async () => {
    const onDateChange = vi.fn();
    render(<CalendarButton selectedDate="2026-11-15" onDateChange={onDateChange} />);
    const dialog = await openCalendar('2026-11-15');
    await userEvent.click(within(dialog).getByRole('button', { name: '초기화' }));
    expect(onDateChange).toHaveBeenCalledWith(null);
  });

  it('범위 밖 날짜는 고를 수 없다', async () => {
    const onDateChange = vi.fn();
    render(
      <CalendarButton
        selectedDate="2026-11-15"
        onDateChange={onDateChange}
        minDate={new Date(2026, 10, 5)}
      />,
    );
    const dialog = await openCalendar('2026-11-15');
    expect(within(dialog).getByRole('button', { name: /11월 4일/ })).toBeDisabled();
  });

  it('키보드: 화살표로 날짜를 옮기고 Enter 로 고른다', async () => {
    const onDateChange = vi.fn();
    render(<CalendarButton selectedDate="2026-11-15" onDateChange={onDateChange} />);
    const dialog = await openCalendar('2026-11-15');
    within(dialog).getByRole('button', { name: /11월 15일/ }).focus();
    await userEvent.keyboard('{ArrowRight}{ArrowDown}{Enter}');
    expect(onDateChange).toHaveBeenCalledWith('2026-11-23');
  });

  it('Esc 로 닫고 포커스를 버튼으로 돌린다', async () => {
    render(<CalendarButton selectedDate="2026-11-15" onDateChange={vi.fn()} />);
    await openCalendar('2026-11-15');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2026-11-15' })).toHaveFocus();
  });
});
