import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { mockBrowserLocale } from '@/test/browserLocale';
import QuoteReviewModal from './QuoteReviewModal';

/** 재고 확인 시각은 브라우저 언어(de-DE, 24시간)가 아니라 화면 언어를 따른다 */
describe('견적 검토 모달 재고 확인 시각', () => {
  afterEach(() => vi.restoreAllMocks());

  it('영어 화면이면 영어 시각(AM, PM)', async () => {
    mockBrowserLocale('de-DE');
    renderWithProviders(<QuoteReviewModal id="m" onClose={() => {}} selectedQuotationId="q-1" />, {
      locale: 'en',
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Check stock' }));
    expect(await screen.findByText(/^Checked at: \d{2}:\d{2} (AM|PM)$/)).toBeInTheDocument();
  });

  it('한국어 화면은 예전과 같다(오전, 오후)', async () => {
    mockBrowserLocale('de-DE');
    renderWithProviders(<QuoteReviewModal id="m" onClose={() => {}} selectedQuotationId="q-1" />);
    await userEvent.click(await screen.findByRole('button', { name: '재고 확인' }));
    expect(
      await screen.findByText(/^재고 확인 일시: (오전|오후) \d{2}:\d{2}$/),
    ).toBeInTheDocument();
  });
});
