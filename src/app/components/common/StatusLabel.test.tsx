import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import ko from '@/i18n/messages/ko.json';
import en from '@/i18n/messages/en.json';
import StatusLabel from './StatusLabel';

describe('StatusLabel(i18n 1)', () => {
  it.each([
    ['ko', ko, 'APPROVED', '승인'],
    ['en', en, 'APPROVED', 'Approved'],
    ['en', en, '입고', 'Inbound'],
    ['ko', ko, 'NOPE', '알 수 없음'],
    ['en', en, 'NOPE', 'Unknown'],
  ] as const)('%s %s → %s', (locale, messages, code, text) => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <StatusLabel statusCode={code} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
