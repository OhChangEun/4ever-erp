import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, // 리액트 스트릭트 모드 (개발 시 문제 탐지)

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
    optimizePackageImports: ['recharts', '@tanstack/react-query'],
  },

  // Turbopack 설정 (빈 객체로 에러 회피)
  turbopack: {},
};

export default nextConfig;
