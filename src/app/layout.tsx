import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Sans_KR } from 'next/font/google';
import '../styles/globals.css';
import IntlProvider from '@/i18n/IntlProvider';
import WebVitalsLazy from './components/WebVitalsLazy';

const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EvErp',
  description: '기업 자원 관리 통합 시스템',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansKR.variable}`}
    >
      <body>
        <WebVitalsLazy />
        {/* 언어는 브라우저가 쿠키로 고른다. 서버는 한국어로 정적 렌더(i18n 1 카드 결정 2) */}
        <IntlProvider>{children}</IntlProvider>
      </body>
    </html>
  );
}
