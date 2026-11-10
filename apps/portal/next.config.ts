import type { NextConfig } from 'next';

// 포털은 @everp/auth 를 소스 그대로 가져온다(erp 와 같은 방식)
const nextConfig: NextConfig = {
  transpilePackages: ['@everp/auth'],
};

export default nextConfig;
