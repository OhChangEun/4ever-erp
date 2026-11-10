import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import StatSection from './StatSection';
import { AppError } from '@/lib/AppError';
import type { StatCardType } from '@/app/types/StatType';

const card: StatCardType = {
  title: '매출',
  value: '₩1,200',
  change: '12%',
  changeType: 'increase',
};
const statsData = { week: [card], month: [card], quarter: [card], year: [card] };
const empty = { week: [], month: [], quarter: [], year: [] };

describe('StatSection', () => {
  it('오류가 없으면 지표 카드를 그린다', () => {
    renderWithProviders(<StatSection statsData={statsData} />);
    expect(screen.getByText('매출')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('오류가 있으면 0 값 카드 대신 role=alert 한 줄을 그린다', () => {
    renderWithProviders(
      <StatSection
        statsData={empty}
        error={new AppError('server', '서버 오류', { status: 500 })}
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('지표를 불러오지 못했습니다.');
    expect(alert).toHaveTextContent('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    expect(screen.queryByText('₩0')).not.toBeInTheDocument();
    expect(screen.queryByRole('definition')).not.toBeInTheDocument();
  });
});
