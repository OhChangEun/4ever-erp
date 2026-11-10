import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import SearchBar from './SearchBar';

const meta = {
  title: '입력/SearchBar',
  component: SearchBar,
  args: {
    options: [
      { key: 'NAME', value: '이름' },
      { key: 'CODE', value: '코드' },
    ],
    onTypeChange: fn(),
    onKeywordSearch: fn(),
    placeholder: '검색어를 입력하세요',
    autoSelectFirst: true,
  },
} satisfies Meta<typeof SearchBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
