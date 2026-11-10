import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import ModalStatusBox from './ModalStatusBox';

const meta = {
  title: '피드백/ModalStatusBox',
  component: ModalStatusBox,
  args: { type: 'loading', message: '창고 정보를 불러오는 중입니다...' },
} satisfies Meta<typeof ModalStatusBox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};
export const Error: Story = {
  args: { type: 'error', message: '창고 정보를 불러오는 중 오류가 발생했습니다.', onClose: fn() },
};
