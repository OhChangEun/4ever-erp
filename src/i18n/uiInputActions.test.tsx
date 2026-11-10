import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DropdownInputListModal, DropdownInputModal, InputList } from '@everp/ui';
import { IntlTestProvider } from '@/test/render';
import type { Locale } from './locale';

const translations = [
  {
    locale: 'ko',
    remove: '항목 삭제',
    openInput: '입력 창 열기',
    openListInput: '목록 입력 창 열기',
    confirm: '확인',
  },
  {
    locale: 'en',
    remove: 'Delete item',
    openInput: 'Open input',
    openListInput: 'Open list input',
    confirm: 'OK',
  },
] satisfies {
  locale: Locale;
  remove: string;
  openInput: string;
  openListInput: string;
  confirm: string;
}[];

describe.each(translations)('$locale 입력 버튼 이름의 앱 번역', (text) => {
  it('삭제 버튼을 번역된 이름으로 찾아 사용할 수 있다', async () => {
    const onChange = vi.fn();
    render(
      <IntlTestProvider locale={text.locale}>
        <InputList initialItems={[{ key: 7, value: '조립' }]} onChange={onChange} />
      </IntlTestProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: text.remove }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith([]);
  });

  it('글자 입력 창을 번역된 이름으로 연다', async () => {
    render(
      <IntlTestProvider locale={text.locale}>
        <DropdownInputModal placeholder="Memo" onSubmit={vi.fn()} />
      </IntlTestProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: text.openInput }));

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: text.confirm })).toBeInTheDocument();
  });

  it('목록 입력 창을 번역된 이름으로 열고 삭제 버튼도 번역한다', async () => {
    render(
      <IntlTestProvider locale={text.locale}>
        <DropdownInputListModal initialItems={[{ key: 7, value: '조립' }]} onSubmit={vi.fn()} />
      </IntlTestProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: text.openListInput }));

    expect(screen.getByRole('button', { name: text.remove })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: text.confirm })).toBeInTheDocument();
  });
});
