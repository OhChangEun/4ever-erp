import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import SalesQuoteList from './SalesQuoteList';

/**
 * 카드 "목 데이터 현실성". 기본 목(덮어쓰기 없음)으로 본다.
 * 예전 상세 목은 어떤 견적을 열어도 QT-2026-001(한빛전자, ₩12,500,000)의 본문이었다.
 */
describe('견적 검토 모달은 목록에서 고른 견적의 내용이다', () => {
  it('QT-2026-014 를 골라 열면 성원오토, ₩5,160,000, 2026-11-06', async () => {
    // 첫 쪽의 대기 견적(카드 "데모 데이터 채우기". QT-2026-002 대성기계는 2쪽이다)
    const user = userEvent.setup();
    renderWithProviders(<SalesQuoteList />);

    await user.click(await screen.findByRole('checkbox', { name: 'QT-2026-014 선택' }));
    await user.click(screen.getByRole('button', { name: '견적 검토 요청' }));

    const dialog = within(await screen.findByRole('dialog', { name: '견적 검토 요청' }));
    expect(await dialog.findByText('성원오토')).toBeInTheDocument();
    expect(dialog.getByText('₩5,160,000')).toBeInTheDocument();
    expect(dialog.getByText('2026-11-06')).toBeInTheDocument();
    expect(dialog.queryByText('한빛전자')).not.toBeInTheDocument();
  });
});
