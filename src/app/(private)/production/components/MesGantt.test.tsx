import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MesGantt from './MesGantt';

const rows = [
  {
    mesId: 'mes-1',
    mesNumber: 'MES-1',
    productName: '모터 A',
    startDate: '2026-11-01',
    endDate: '2026-11-08',
    status: 'IN_PROGRESS',
    progressRate: 60,
  },
  {
    mesId: 'mes-2',
    mesNumber: 'MES-2',
    productName: '펌프 B',
    startDate: '2026-11-05',
    endDate: '2026-11-15',
    status: 'WAITING',
    progressRate: 0,
  },
  {
    mesId: 'mes-3',
    mesNumber: 'MES-3',
    productName: '밸브 C',
    startDate: '2026-11-09',
    endDate: '2026-11-20',
    status: 'WAITING',
    progressRate: 0,
  },
];

describe('MesGantt(시각화 3)', () => {
  it('작업지시마다 막대 하나, 지연은 이름과 글자로', () => {
    render(<MesGantt rows={rows} today={new Date(2026, 10, 10)} onSelect={() => {}} />);
    const list = screen.getByRole('list', { name: 'MES 작업 일정(간트)' });
    const bars = screen.getAllByRole('listitem');
    expect(list).toContainElement(bars[0]);
    expect(bars).toHaveLength(3);
    expect(bars[0]).toHaveAccessibleName(/MES-1 모터 A, .*진행 60%, 지연/);
    expect(bars[1]).not.toHaveAccessibleName(/지연/);
    expect(screen.getByText('지연')).toBeInTheDocument();
  });

  it('위아래 화살표, Home/End 로 옮기고 Enter 로 상세를 연다', async () => {
    const onSelect = vi.fn();
    render(<MesGantt rows={rows} today={new Date(2026, 10, 10)} onSelect={onSelect} />);
    const bars = screen.getAllByRole('listitem');
    expect(bars[0]).toHaveAttribute('tabindex', '0');
    expect(bars[1]).toHaveAttribute('tabindex', '-1');
    bars[0].focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(bars[1]).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(bars[2]).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(bars[0]).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('mes-1');
  });
});
