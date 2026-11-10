import type { Meta, StoryObj } from '@storybook/react-vite';
import Input from './Input';

const meta = {
  title: '입력/Input',
  component: Input,
  args: { label: '창고명', placeholder: '창고 이름을 입력하세요', id: 'warehouse-name' },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Required: Story = { args: { required: true } };
export const WithError: Story = { args: { error: '창고명을 입력해 주세요.' } };
export const Disabled: Story = { args: { disabled: true, value: 'WH-001', readOnly: true } };
