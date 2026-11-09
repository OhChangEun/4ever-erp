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
});
