import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import EmployeesTab from './EmployeesTab';

/** 카드 "목 필터와 검색". 기본 목(덮어쓰기 없음)으로 이름을 검색하면 그 직원만 남는다 */
const dataRows = () =>
  screen.getAllByRole('row').filter((row) => within(row).queryAllByRole('cell').length > 0);

describe('직원 이름 검색', () => {
  it('이름을 입력하면 그 직원만 남는다', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmployeesTab />);
    expect(await screen.findByText('홍길동', {}, { timeout: 3000 })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('직원 이름 검색'), '윤지호');

    await waitFor(
      () => {
        const rows = dataRows();
        expect(rows).toHaveLength(1);
        expect(within(rows[0]).getByText('윤지호')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.queryByText('홍길동')).not.toBeInTheDocument();
  });
});
