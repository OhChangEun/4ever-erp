import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import Pagination from './Pagination';

const meta = {
  title: '데이터/Pagination',
  component: Pagination,
  args: { currentPage: 1, totalPages: 12, totalElements: 118, onPageChange: fn() },
} satisfies Meta<typeof Pagination>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPage: Story = {};
export const Middle: Story = { args: { currentPage: 6 } };
export const SinglePage: Story = { args: { totalPages: 1, totalElements: 3 } };
