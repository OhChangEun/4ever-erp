import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as z from 'zod';
import { renderWithProviders } from '@/test/render';
import { mockApi } from '@/test/mockApi';
import EmployeesTab from './EmployeesTab';

/** 카드 "데모 데이터 채우기". 기본 목(덮어쓰기 없음)의 직원 목록이 2쪽이고, 넘기면 다른 직원이 보인다 */
const namesOf = async (page: number) =>
  z
    .object({ data: z.object({ content: z.array(z.object({ name: z.string() })) }) })
    .parse(await mockApi('GET', `/business/hrm/employee?page=${page}&size=10`))
    .data.content.map((employee) => employee.name);

describe('직원 목록 쪽 넘기기', () => {
  it('2쪽 버튼을 누르면 1쪽에 없던 직원이 보이고 1쪽 직원은 사라진다', async () => {
    const [firstPage, secondPage] = [await namesOf(0), await namesOf(1)];
    const user = userEvent.setup();
    renderWithProviders(<EmployeesTab />);

    expect(await screen.findByText(firstPage[0], {}, { timeout: 3000 })).toBeInTheDocument();
    await user.click(within(screen.getByRole('navigation')).getByRole('button', { name: '2' }));

    expect(await screen.findByText(secondPage[0], {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText(firstPage[0])).not.toBeInTheDocument();
  });
});
