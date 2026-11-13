import { describe, expect, it } from 'vitest';
import type { ComponentType } from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import PurchaseRequestListTab from './purchase/components/tabs/PurchaseRequestListTab';
import PurchaseOrderListTab from './purchase/components/tabs/PurchaseOrderListTab';
import SupplierListTab from './purchase/components/tabs/SupplierListTab';
import AttendanceTab from './hrm/components/tabs/subTab/attendanceTab/AttendanceTab';

/**
 * 카드 "목 필터와 검색" 별도 보고 1. 필터 드롭다운은 첫 항목이 "전체"라 한 번 고른 필터를 되돌릴 수 있다.
 * 글자는 공통 메시지 common.all(영어 All). 예전엔 이 다섯 드롭다운에 전체가 없었다
 */
const CASES: Array<[string, ComponentType, string, string]> = [
  ['구매 요청 상태', PurchaseRequestListTab, '전체 상태', 'All statuses'],
  ['발주 상태', PurchaseOrderListTab, '전체 상태', 'All statuses'],
  ['공급사 상태', SupplierListTab, '전체 상태', 'All statuses'],
  ['공급사 분류', SupplierListTab, '전체 카테고리', 'All categories'],
  ['출퇴근 상태', AttendanceTab, '전체 상태', 'All statuses'],
];

describe.each([
  ['ko', '전체'],
  ['en', 'All'],
] as const)('필터 드롭다운의 전체 항목(%s)', (locale, allLabel) => {
  it.each(CASES)('%s: 첫 항목이 전체다', async (_, Tab, ko, en) => {
    const user = userEvent.setup();
    renderWithProviders(<Tab />, { locale });
    const combobox = await screen.findByRole('combobox', { name: locale === 'ko' ? ko : en });
    await user.click(combobox);
    // 서버 옵션을 받은 뒤 전체가 맨 앞에 붙는다
    await waitFor(() =>
      expect(within(screen.getByRole('listbox')).getAllByRole('option').length).toBeGreaterThan(1),
    );
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options[0]).toHaveTextContent(new RegExp(`^${allLabel}$`));
  });
});
