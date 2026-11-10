import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DropdownInputModal from './DropdownInputModal';

describe('DropdownInputModal', () => {
  it('열 때 부모의 최신 값으로 초안을 채운다', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <DropdownInputModal placeholder="메모" value="처음" onSubmit={() => undefined} />,
    );
    rerender(<DropdownInputModal placeholder="메모" value="바뀐 값" onSubmit={() => undefined} />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByPlaceholderText('메모')).toHaveValue('바뀐 값');
  });

  it('열려 있는 동안 부모 값이 바뀌어도 입력 중인 글자를 덮지 않는다', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <DropdownInputModal placeholder="메모" value="처음" onSubmit={() => undefined} />,
    );
    await user.click(screen.getByRole('button'));
    await user.type(screen.getByPlaceholderText('메모'), ' 입력 중');
    rerender(<DropdownInputModal placeholder="메모" value="바뀐 값" onSubmit={() => undefined} />);
    expect(screen.getByPlaceholderText('메모')).toHaveValue('처음 입력 중');
  });
});
