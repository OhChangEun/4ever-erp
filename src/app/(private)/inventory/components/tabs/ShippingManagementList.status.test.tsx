import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import ko from '@/i18n/messages/ko.json';
import en from '@/i18n/messages/en.json';
import { renderWithProviders } from '@/test/render';
import StatusLabel from '@/app/components/common/StatusLabel';
import ShippingManagementList from './ShippingManagementList';

/**
 * 목이 쓰기 결과를 따르게 리뷰. 출하 목록의 상태 칸이 "알 수 없음"이었다.
 * 계약과 목에 FE 오타 READT_TO_SHIP 이 있었고, 생산중 목록의 PRODUCTION 은 상태 글자가 없었다.
 */
describe('출하 목록의 상태 칸', () => {
  it('생산중 탭과 출고 준비 완료 탭의 상태가 알 수 없음이 아니라 글자로 보인다', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShippingManagementList />);

    const producing = within(
      await screen.findByRole('row', { name: /SO-2026-001/ }, { timeout: 3000 }),
    );
    expect(producing.getByText('생산중')).toBeInTheDocument();
    expect(screen.queryByText('알 수 없음')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /출고 준비 완료/ }));
    const ready = within(await screen.findByRole('row', { name: /SO-2026-002/ }));
    expect(ready.getByText('출고 준비 완료')).toBeInTheDocument();
    expect(screen.queryByText('알 수 없음')).not.toBeInTheDocument();
  });

  // 실서버 값이 어느 쪽인지 확인하지 못해 후보를 다 받는다(verified=false)
  it.each([
    ['ko', 'PRODUCTION', '생산중', ko],
    ['ko', 'IN_PRODUCTION', '생산중', ko],
    ['en', 'PRODUCTION', 'In production', en],
    ['ko', 'READY_TO_SHIP', '출고 준비 완료', ko],
    ['ko', 'READY_FOR_SHIPMENT', '출고 준비 완료', ko],
  ] as const)('%s 상태 %s 는 %s 로 보인다', (locale, code, text, messages) => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <StatusLabel statusCode={code} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
