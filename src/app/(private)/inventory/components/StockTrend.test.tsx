import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import StockTrend from './StockTrend';

describe('StockTrend(시각화 2)', () => {
  it('요약 문장과 안전재고, 소진 예상을 글자로 보인다', async () => {
    renderWithProviders(<StockTrend itemId="item-1001" />);
    const region = await screen.findByRole('region', { name: '재고 추이(30일)' });
    expect(region).toHaveTextContent('안전재고 50');
    expect(await screen.findByText(/30일 동안/)).toBeInTheDocument();
  });

  it('표로 보기를 누르면 같은 데이터의 표(30행)가 열린다', async () => {
    renderWithProviders(<StockTrend itemId="item-1001" />);
    await userEvent.click(await screen.findByRole('button', { name: '표로 보기' }));
    const table = screen.getByRole('table', { name: '재고 추이 표' });
    expect(table.querySelectorAll('tbody tr')).toHaveLength(30);
  });
});
