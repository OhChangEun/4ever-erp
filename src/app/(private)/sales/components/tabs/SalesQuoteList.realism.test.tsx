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
  it('QT-2026-002 를 골라 열면 대성기계, ₩4,300,000, 2026-01-14', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SalesQuoteList />);

    await user.click(await screen.findByRole('checkbox', { name: 'QT-2026-002 선택' }));
    await user.click(screen.getByRole('button', { name: '견적 검토 요청' }));

    const dialog = within(await screen.findByRole('dialog', { name: '견적 검토 요청' }));
    expect(await dialog.findByText('대성기계')).toBeInTheDocument();
    expect(dialog.getByText('₩4,300,000')).toBeInTheDocument();
    expect(dialog.getByText('2026-01-14')).toBeInTheDocument();
    expect(dialog.queryByText('한빛전자')).not.toBeInTheDocument();
  });
});
