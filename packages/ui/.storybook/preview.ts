import type { Preview } from '@storybook/react-vite';
// Tailwind, 토큰(packages/ui/tokens.css), 아이콘
import './preview.css';

const preview: Preview = {
  parameters: {
    // 접근성 위반은 패널에 경고가 아니라 실패로 보인다
    a11y: { test: 'error' },
  },
};

export default preview;
