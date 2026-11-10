import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DropdownInputListModal from './DropdownInputListModal';

const first = [{ key: 1, value: '조립' }];
const changed = [
  { key: 1, value: '절단' },
  { key: 2, value: '도장' },
];

describe('DropdownInputListModal', () => {
  it('닫혀 있는 동안 부모가 바꾼 목록을 열 때 보인다', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DropdownInputListModal initialItems={first} onSubmit={vi.fn()} />);
    rerender(<DropdownInputListModal initialItems={changed} onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '목록 입력 창 열기' }));

    expect(screen.getByRole('textbox', { name: '1번 항목' })).toHaveValue('절단');
    expect(screen.getByRole('textbox', { name: '2번 항목' })).toHaveValue('도장');
  });

  it('한 번 확인한 뒤 부모가 목록을 바꾸면 다시 열 때 바뀐 목록을 보인다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <DropdownInputListModal initialItems={first} onSubmit={onSubmit} />,
    );
    await user.click(screen.getByRole('button', { name: '목록 입력 창 열기' }));
    await user.click(screen.getByRole('button', { name: '확인' }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(first);

    rerender(<DropdownInputListModal initialItems={changed} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: '목록 입력 창 열기' }));

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('절단');
    expect(inputs[1]).toHaveValue('도장');
  });

  it('열려 있는 동안 부모가 목록을 바꿔도 입력 중인 값을 덮지 않고 그 값을 제출한다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <DropdownInputListModal initialItems={first} onSubmit={onSubmit} />,
    );
    await user.click(screen.getByRole('button', { name: '목록 입력 창 열기' }));
    await user.type(screen.getByRole('textbox', { name: '1번 항목' }), ' 2차');

    rerender(<DropdownInputListModal initialItems={changed} onSubmit={onSubmit} />);

    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: '1번 항목' })).toHaveValue('조립 2차');
    await user.click(screen.getByRole('button', { name: '확인' }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith([{ key: 1, value: '조립 2차' }]);
  });
});
