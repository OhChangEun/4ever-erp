import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import Dropdown from './Dropdown';

const ITEMS = [
  { key: 'ALL', value: '전체' },
  { key: 'MATERIAL', value: '원자재' },
  { key: 'ITEM', value: '부품' },
];

/** 값을 들고 있는 껍데기. 스토리에서 고른 값이 버튼 글자로 바뀌는지 본다 */
function Controlled({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState('');
  return (
    <Dropdown
      placeholder="창고 유형"
      items={ITEMS}
      value={value}
      onChange={setValue}
      disabled={disabled}
    />
  );
}

const meta = {
  title: '입력/Dropdown',
  component: Controlled,
} satisfies Meta<typeof Controlled>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };

/** 키보드만으로 열고 고른다(접근성 3 카드의 select-only combobox) */
export const KeyboardSelect: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const combobox = canvas.getByRole('combobox', { name: '창고 유형' });
    combobox.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
    await expect(combobox).toHaveTextContent('부품');
    await expect(combobox).toHaveAttribute('aria-expanded', 'false');
  },
};
