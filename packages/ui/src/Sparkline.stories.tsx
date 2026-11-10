import type { Meta, StoryObj } from '@storybook/react-vite';
import Sparkline from './Sparkline';

const meta = {
  title: '데이터/Sparkline',
  component: Sparkline,
  args: { data: [820, 910, 870, 1040, 980, 1120, 1200], label: '주간 매출 추이' },
} satisfies Meta<typeof Sparkline>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Week: Story = {};
export const Flat: Story = { args: { data: [5, 5, 5, 5, 5], label: '변화 없음' } };
export const Year: Story = {
  args: { data: [30, 42, 38, 51, 47, 60, 58, 72, 69, 80, 77, 91], label: '연간 출고 추이' },
};
