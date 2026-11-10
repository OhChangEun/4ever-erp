import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import IconButton from './IconButton';

const meta = {
  title: '입력/IconButton',
  component: IconButton,
  args: { icon: 'ri-refresh-line', label: '새로고침', onClick: fn() },
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithLabel: Story = {};
// 아이콘만 있으면 이름은 aria-label 로 준다
export const IconOnly: Story = {
  args: { label: undefined, 'aria-label': '닫기', icon: 'ri-close-line', variant: 'ghost' },
};
export const Soft: Story = { args: { variant: 'soft' } };
