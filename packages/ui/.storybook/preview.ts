import type { Preview } from '@storybook/react-vite';
// 토큰과 아이콘은 아직 앱에서 빌려 온다. 디자인 토큰 카드에서 packages/ui 로 옮긴다
import '../../../src/styles/globals.css';
import 'remixicon/fonts/remixicon.css';

const preview: Preview = {
  parameters: {
    // 접근성 위반은 패널에 경고가 아니라 실패로 보인다
    a11y: { test: 'error' },
  },
};

export default preview;
