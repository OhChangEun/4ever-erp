import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import TabButtons from './TabButtons';

const meta = {
  title: '내비게이션/TabButtons',
  component: TabButtons,
  args: {
    tabs: [
      { id: 'request', name: '구매 요청', icon: 'ri-file-list-line' },
      { id: 'order', name: '발주', icon: 'ri-shopping-cart-line' },
      { id: 'supplier', name: '공급사', icon: 'ri-building-line' },
    ],
    activeTab: 'order',
    onTabChange: fn(),
  },
} satisfies Meta<typeof TabButtons>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
