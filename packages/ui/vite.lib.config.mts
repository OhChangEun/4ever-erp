import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

/**
 * @everp/ui 라이브러리 빌드(계획 16-1 "라이브러리 빌드 툴체인"). 앱은 지금처럼 src 를 바로 쓴다(transpilePackages).
 * 이 빌드는 패키지를 밖에 낼 때의 모양을 만든다: ESM 만, 파일마다 하나씩(preserveModules), 의존은 번들하지 않는다.
 * 라이브러리를 번들하지 않는 이유: 쓰는 쪽 번들러가 tree-shaking 과 중복 제거를 하게 두려고.
 */
const externals = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
  'react/jsx-runtime',
];

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    target: 'es2022',
    lib: { entry: 'src/index.ts', formats: ['es'] },
    rollupOptions: {
      external: (id) => externals.some((name) => id === name || id.startsWith(`${name}/`)),
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
});
