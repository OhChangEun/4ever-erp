import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dropdown from './Dropdown';

const ITEMS = [
  { key: 'ALL', value: '전체' },
  { key: 'MATERIAL', value: '원자재' },
  { key: 'ITEM', value: '부품' },
  { key: 'ETC', value: '기타' },
];

function Harness({ onChange }: { onChange?: (key: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <Dropdown
      placeholder="창고 유형"
      items={ITEMS}
      value={value}
      onChange={(key) => {
        setValue(key);
        onChange?.(key);
      }}
    />
  );
}

const setup = (onChange?: (key: string) => void) => {
  render(<Harness onChange={onChange} />);
  const combobox = screen.getByRole('combobox', { name: '창고 유형' });
  return { combobox };
};

const activeOption = (combobox: HTMLElement) => {
  const id = combobox.getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};

describe('Dropdown(키보드와 listbox)', () => {
  it('combobox 와 listbox, option 으로 읽힌다', async () => {
    const { combobox } = setup();
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(combobox);
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox');
    expect(combobox).toHaveAttribute('aria-controls', listbox.id);
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('아래 화살표로 열고 첫 항목을 가리킨다. 포커스는 버튼에 남는다', async () => {
    const { combobox } = setup();
    combobox.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(activeOption(combobox)).toHaveTextContent('전체');
    expect(combobox).toHaveFocus();
  });

  it('화살표로 옮기고 Enter 로 고르면 값이 바뀌고 닫힌다', async () => {
    const onChange = vi.fn();
    const { combobox } = setup(onChange);
    combobox.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(activeOption(combobox)).toHaveTextContent('부품');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('ITEM');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(combobox).toHaveTextContent('부품');
    expect(combobox).toHaveFocus();
  });

  it('Home, End 로 처음과 끝으로 간다', async () => {
    const { combobox } = setup();
    combobox.focus();
    await userEvent.keyboard('{ArrowDown}{End}');
    expect(activeOption(combobox)).toHaveTextContent('기타');
    await userEvent.keyboard('{Home}');
    expect(activeOption(combobox)).toHaveTextContent('전체');
  });

  it('글자를 치면 그 글자로 시작하는 항목으로 간다', async () => {
    const { combobox } = setup();
    combobox.focus();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('부');
    expect(activeOption(combobox)).toHaveTextContent('부품');
  });

  it('Esc 는 값을 바꾸지 않고 닫는다', async () => {
    const onChange = vi.fn();
    const { combobox } = setup(onChange);
    combobox.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(combobox).toHaveTextContent('창고 유형');
  });

  it('다시 열면 고른 항목을 가리키고 aria-selected 가 붙어 있다', async () => {
    const { combobox } = setup();
    await userEvent.click(combobox);
    await userEvent.click(screen.getByRole('option', { name: '기타' }));
    combobox.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(activeOption(combobox)).toHaveTextContent('기타');
    expect(screen.getByRole('option', { name: '기타' })).toHaveAttribute('aria-selected', 'true');
  });
});
