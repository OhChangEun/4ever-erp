import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// 언어별 메시지(i18n 1 카드). precompile: 메시지를 빌드 때 바꿔 브라우저가 ICU 해석기를 받지 않게 한다(첫 로드 JS)
const withNextIntl = createNextIntlPlugin({
  requestConfig: './src/i18n/request.ts',
  experimental: {
    // 도메인 메시지 폴더도 넣어야 precompile 된다(빠지면 ICU 해석기가 번들에 다시 들어온다)
    messages: {
      path: ['./src/i18n/messages', './src/i18n/messages/finance', './src/i18n/messages/warehouse'],
      format: 'json',
      locales: 'infer',
      precompile: true,
    },
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true, // 리액트 스트릭트 모드 (개발 시 문제 탐지)

  // 워크스페이스 패키지는 TS 소스를 그대로 내보낸다. Next 가 변환한다(모노레포 2 카드)
  transpilePackages: ['@everp/ui', '@everp/auth'],

  compiler: {
    // 프로덕션에서 console.log 제거
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
      },
    ],
  },

  // 실험적 기능들
  experimental: {
    // 큰 라이브러리들의 import 최적화
    optimizePackageImports: ['recharts', '@tanstack/react-query', '@everp/ui'],
  },

  // Turbopack 설정 (빈 객체로 에러 회피)
  turbopack: {},
};

export default withNextIntl(nextConfig);
