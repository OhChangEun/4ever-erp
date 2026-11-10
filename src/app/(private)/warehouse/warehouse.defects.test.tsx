import { expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import WarehouseList from './components/WarehouseList';

it.each([
  { locale: 'ko', type: '원자재창고', detail: '상세보기' },
  { locale: 'en', type: 'Raw materials warehouse', detail: 'Details' },
] satisfies { locale: 'ko' | 'en'; type: string; detail: string }[])(
  '$locale 창고 목록과 상세의 RAW 코드를 라벨로 표시한다',
  async ({ locale, type, detail }) => {
    renderWithProviders(<WarehouseList />, { locale });
    expect((await screen.findAllByText(type)).length).toBeGreaterThan(0);
    await userEvent.click(screen.getAllByRole('button', { name: detail })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(type)).toBeInTheDocument();
  },
);
