import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import StatCardItem from './StatCardItem';
import { createStatCard } from '@/lib/CreateStatCard';

describe('StatCardItem 스파크라인(시각화 1)', () => {
  it('추이가 있으면 지표 이름으로 된 스파크라인을 그린다', () => {
    const stat = createStatCard('총 매출', 1200, 12, '₩', [800, 900, 1000, 1200]);
    renderWithProviders(
      <dl>
        <StatCardItem stat={stat} currentPeriodLabel="전주 대비" />
      </dl>,
    );
    expect(screen.getByRole('img', { name: /총 매출 추이/ })).toBeInTheDocument();
  });

  it('추이가 없으면 그리지 않는다(가짜 그래프 금지)', () => {
    renderWithProviders(
      <dl>
        <StatCardItem
          stat={createStatCard('총 매출', 1200, 12, '₩')}
          currentPeriodLabel="전주 대비"
        />
      </dl>,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
