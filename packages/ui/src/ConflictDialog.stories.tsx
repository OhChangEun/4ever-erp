import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import ConflictDialog from './ConflictDialog';

const meta = {
  title: '피드백/ConflictDialog',
  component: ConflictDialog,
  args: { subject: 'BOM', onClose: fn(), onReload: fn() },
  // 부모의 relative 영역 위에 덮는 컴포넌트라 자리를 만든다
  decorators: [(Story) => <div className="relative h-80 w-[480px]">{Story()}</div>],
} satisfies Meta<typeof ConflictDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 열리면 "최신 데이터 불러오기"에 포커스, Esc 는 닫기 */
export const KeyboardClose: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alertdialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalled();
  },
};
