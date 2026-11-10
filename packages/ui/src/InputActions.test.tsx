import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InputList from './InputList';
import DropdownInputModal from './DropdownInputModal';
import DropdownInputListModal from './DropdownInputListModal';

describe('입력 아이콘 버튼의 접근 가능한 이름', () => {
  it('이름으로 찾은 삭제 버튼이 해당 항목만 지운다', async () => {
    const onChange = vi.fn();
    render(<InputList initialItems={[{ key: 7, value: '조립' }]} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: '항목 삭제' }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith([]);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('이름으로 찾은 연필 버튼이 글자 입력 창을 연다', async () => {
    render(<DropdownInputModal placeholder="메모" value="초안" onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '입력 창 열기' }));

    expect(screen.getByRole('textbox')).toHaveValue('초안');
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument();
  });

  it('이름으로 찾은 연필 버튼이 목록 입력 창을 연다', async () => {
    render(
      <DropdownInputListModal initialItems={[{ key: 7, value: '조립' }]} onSubmit={vi.fn()} />,
    );

    await userEvent.click(screen.getByRole('button', { name: '목록 입력 창 열기' }));

    expect(screen.getByRole('textbox')).toHaveValue('조립');
    expect(screen.getByRole('button', { name: '항목 삭제' })).toBeInTheDocument();
  });
});
