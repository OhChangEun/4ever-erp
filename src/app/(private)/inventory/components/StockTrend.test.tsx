import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import StockTrend from './StockTrend';

describe('StockTrend(시각화 2)', () => {
  it('요약 문장과 안전재고, 소진 예상을 글자로 보인다', async () => {
    renderWithProviders(<StockTrend itemId="item-1001" />);
    // 데이터가 온 뒤(요약 문장이 뜬 뒤)에 확인한다
    const summary = await screen.findByText(/30일 동안/);
    const region = screen.getByRole('region', { name: '재고 추이(30일)' });
    expect(region).toContainElement(summary);
    // 목은 오늘 120 에서 끝나고 하루 약 5 씩 줄어든다(src/mocks/handlers/stockHistory.handlers.ts)
    expect(summary).toHaveTextContent(/에서 120EA로/);
    expect(summary).toHaveTextContent('안전재고 50');
    expect(summary).toHaveTextContent(/약 1[3-6]일 뒤 안전재고 아래/);
  });

  it('표로 보기를 누르면 같은 데이터의 표(30행)가 열린다', async () => {
    renderWithProviders(<StockTrend itemId="item-1001" />);
    await userEvent.click(await screen.findByRole('button', { name: '표로 보기' }));
    const table = screen.getByRole('table', { name: '재고 추이 표' });
    expect(table.querySelectorAll('tbody tr')).toHaveLength(30);
  });
});
