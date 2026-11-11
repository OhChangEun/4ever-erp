import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { dropAt, nullAt, serveEdited, valueAt } from '@/test/contract/mockData';
import { HRM_ENDPOINTS } from '@/app/(private)/hrm/api/hrm.endpoints';
import EmployeeTrainingTab from './EmployeeTrainingTab';

describe('직원 교육 현황 탭의 빈 값(응답 null 허용 카드)', () => {
  it.each([
    ['null', nullAt],
    ['키 누락', dropAt],
  ])('최근 교육일이 %s 인 직원도 목록에 나오고 그 칸은 - 로 보인다', async (_, edit) => {
    const data = await serveEdited(HRM_ENDPOINTS.TRAINING_STATUS, (d) => {
      edit(d, ['items', 0, 'lastTrainingDate']);
    });
    renderWithProviders(<EmployeeTrainingTab />);

    const name = await screen.findByText(String(valueAt(data, ['items', 0, 'name'])));
    const row = name.closest('tr');
    if (!row) throw new Error('직원 이름이 표 행 안에 없다');
    expect(within(row).getByText('-')).toBeInTheDocument();
  });
});
