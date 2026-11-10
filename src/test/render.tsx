import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import ko from '@/i18n/messages/ko.json';
import en from '@/i18n/messages/en.json';
import financeKo from '@/i18n/messages/finance/ko.json';
import financeEn from '@/i18n/messages/finance/en.json';
import warehouseKo from '@/i18n/messages/warehouse/ko.json';
import warehouseEn from '@/i18n/messages/warehouse/en.json';
import dashboardKo from '@/i18n/messages/dashboard/ko.json';
import dashboardEn from '@/i18n/messages/dashboard/en.json';
import type { Locale } from '@/i18n/locale';
import { ModalProvider } from '@/app/components/common/modal/ModalProvider';
import { ToastProvider } from '@/app/components/common/toast/ToastProvider';

/**
 * 화면 컴포넌트를 앱과 같은 Provider 안에서 렌더한다.
 * retry 는 0 으로 둔다. 실패 시나리오 테스트가 재시도 때문에 느려지면 안 된다.
 * gcTime 은 Infinity. 테스트마다 새 클라이언트라 누수가 없고, 0 이면 관찰자 없는 시드 캐시가
 * 다음 틱에 지워져 "안 바뀌어야 할 키" 확인이 키가 없어서 통과하는 가짜 초록이 된다.
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

// 공통 메시지와 도메인 메시지를 합친다. 앱에서는 도메인 레이아웃(DomainMessages)이 합친다
const MESSAGES = {
  ko: { ...ko, finance: financeKo, warehouse: warehouseKo, dashboard: dashboardKo },
  en: { ...en, finance: financeEn, warehouse: warehouseEn, dashboard: dashboardEn },
} satisfies Record<Locale, object>;

export const renderWithProviders = (
  ui: ReactElement,
  { locale = 'ko', ...options }: RenderOptions & { locale?: Locale } = {},
) => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ModalProvider>{children}</ModalProvider>
        </ToastProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
};
