'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect, useState } from 'react';
import { createQueryClient } from '@/lib/queryClient';
import { redirectToLogin } from '@/lib/auth/redirectToLogin';
import { ModalProvider } from './components/common/modal/ModalProvider';
import { ToastProvider } from './components/common/toast/ToastProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  // 기본값과 401 처리는 src/lib/queryClient.ts 한 곳
  const [queryClient] = useState(() => createQueryClient({ onUnauthorized: redirectToLogin }));

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
      import('@/mocks')
        .then(({ setupMocks }) => setupMocks())
        .catch((err) => console.error('[MSW] Setup failed:', err));
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ModalProvider>{children}</ModalProvider>
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
