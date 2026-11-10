import { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import ko from '@/i18n/messages/ko.json';
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

export const renderWithProviders = (ui: ReactElement, options?: RenderOptions) => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider locale="ko" messages={ko}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ModalProvider>{children}</ModalProvider>
        </ToastProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
};
