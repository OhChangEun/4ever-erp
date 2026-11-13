import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import PurchaseRequestListTab from './PurchaseRequestListTab';

/** 카드 "목 필터와 검색". 기본 목(덮어쓰기 없음)으로 상태 필터를 고르면 표에 그 상태 행만 남는다 */
const dataRows = () =>
  screen.getAllByRole('row').filter((row) => within(row).queryAllByRole('cell').length > 0);

describe('구매 요청 목록 상태 필터', () => {
  it('상태 "승인"을 고르면 표에 승인 행만 남는다', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PurchaseRequestListTab />);
    // 첫 쪽에는 대기, 승인, 반려가 섞여 있다
    await screen.findByRole('row', { name: /PR-2026-015/ }, { timeout: 3000 });
    expect(dataRows().some((row) => within(row).queryByText('대기'))).toBe(true);

    await user.click(screen.getByRole('combobox', { name: '전체 상태' }));
    await user.click(await screen.findByRole('option', { name: '승인' }));

    await waitFor(
      () => {
        const rows = dataRows();
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          expect(within(row).getByText('승인')).toBeInTheDocument();
          expect(within(row).queryByText('대기')).not.toBeInTheDocument();
          expect(within(row).queryByText('반려')).not.toBeInTheDocument();
        }
      },
      { timeout: 3000 },
    );

    // 전체를 고르면 모든 상태가 다시 보인다(카드 "목 필터와 검색" 별도 보고 1. 예전엔 전체 항목이 없어 되돌릴 수 없었다)
    await user.click(screen.getByRole('combobox', { name: '전체 상태' }));
    await user.click(await screen.findByRole('option', { name: '전체' }));
    expect(
      await screen.findByRole('row', { name: /PR-2026-015/ }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(dataRows().some((row) => within(row).queryByText('대기'))).toBe(true);
    expect(dataRows().some((row) => within(row).queryByText('반려'))).toBe(true);
  });
});
