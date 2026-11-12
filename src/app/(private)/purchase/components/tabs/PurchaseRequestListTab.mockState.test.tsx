import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { useAuthStore } from '@/store/authStore';
import PurchaseRequestListTab from './PurchaseRequestListTab';

/**
 * 목이 쓰기 결과를 따르게 카드. 기본 목(덮어쓰기 없음)으로 화면을 끝까지 돈다.
 * 예전엔 반려가 성공해도 목록이 다시 "대기"를 받아 버튼이 안 먹은 것처럼 보였다.
 */
describe('구매 요청 목록: 목이 쓰기 결과를 따른다', () => {
  afterEach(() => {
    useAuthStore.getState().clearUserInfo();
  });

  const requestRow = () => screen.findByRole('row', { name: /PR-2026-001/ }, { timeout: 3000 });

  it('반려하면 그 행의 상태가 반려로 바뀌고 승인과 반려 버튼이 사라진다', async () => {
    // 승인과 반려는 MM 과 ALL_ADMIN 에게만 보인다
    useAuthStore
      .getState()
      .setUserInfo({ id: 1, name: 'tester', email: 't@everp.local', role: 'MM_USER' });
    const user = userEvent.setup();
    renderWithProviders(<PurchaseRequestListTab />);

    const before = within(await requestRow());
    expect(before.getByText('대기')).toBeInTheDocument();
    await user.click(before.getByRole('button', { name: '반려' }));

    const dialog = within(
      await screen.findByRole('dialog', { name: '해당 요청을 반려하시겠습니까?' }),
    );
    await user.type(dialog.getByRole('textbox', { name: '반려 사유' }), '예산 초과');
    await user.click(dialog.getByRole('button', { name: '확인' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await waitFor(async () => {
      const after = within(await requestRow());
      expect(after.getByText('반려')).toBeInTheDocument();
      expect(after.queryByText('대기')).not.toBeInTheDocument();
      expect(after.queryByRole('button', { name: '반려' })).not.toBeInTheDocument();
      expect(after.queryByRole('button', { name: '승인' })).not.toBeInTheDocument();
    });
  });
});
