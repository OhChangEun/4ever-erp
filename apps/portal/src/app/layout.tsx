import type { ReactNode } from 'react';
import './globals.css';

export const metadata = { title: 'EverP 포털', description: '공급사와 고객사용 EverP 포털' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
