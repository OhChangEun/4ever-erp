import { describe, expect, it, vi } from 'vitest';
import { type ReactElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ConflictDialog,
  Dropdown,
  DropdownInputListModal,
  DropdownInputModal,
  ErrorMessage,
  LoadingMessage,
  InputList,
  ModalStatusBox,
  Pagination,
  SearchBar,
  SimplePagination,
  Sparkline,
  Table,
} from '@everp/ui';
import { useUiText } from '@everp/ui';
import { IntlTestProvider, renderWithProviders } from '@/test/render';

const HANGUL = /[가-힣]/;
const noop = () => undefined;

/** 화면 글자와 aria 이름, placeholder 에 한글이 남았는지 */
const hangulLeft = () => {
  const attrs = Array.from(document.body.querySelectorAll('[aria-label], [placeholder]')).flatMap(
    (el) => [el.getAttribute('aria-label') ?? '', el.getAttribute('placeholder') ?? ''],
  );
  return [document.body.textContent, ...attrs].filter((text) => HANGUL.test(text));
};

it('같은 번역으로 브리지를 다시 그려도 UI 문구 값은 유지한다', () => {
  const observe = vi.fn();
  function Consumer() {
    observe(useUiText());
    return null;
  }
  const { rerender } = render(
    <IntlTestProvider>
      <Consumer />
    </IntlTestProvider>,
  );
  const initial = observe.mock.calls.at(-1)?.[0];
  expect(initial).toBeDefined();
  rerender(
    <IntlTestProvider>
      <Consumer />
    </IntlTestProvider>,
  );
  expect(observe.mock.calls.at(-1)?.[0]).toBe(initial);
  rerender(
    <IntlTestProvider locale="en">
      <Consumer />
    </IntlTestProvider>,
  );
  expect(observe.mock.calls.at(-1)?.[0]).not.toBe(initial);
  expect(observe.mock.calls.at(-1)?.[0]).toHaveProperty('close', 'Close');
});

describe('@everp/ui 기본 문구 영어(ui 문구 카드)', () => {
  it('쪽 넘김: 이름, 이전과 다음, 총 건수', () => {
    renderWithProviders(
      <>
        <Pagination currentPage={2} totalPages={5} totalElements={42} onPageChange={noop} />
        <SimplePagination currentPage={2} totalPages={5} onPageChange={noop} />
      </>,
      { locale: 'en' },
    );
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(nav).toHaveTextContent('Total 42');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(hangulLeft()).toEqual([]);
  });

  it('표의 빈 줄, 로딩과 오류 글자', () => {
    renderWithProviders(
      <>
        <Table columns={[{ key: 'name', label: 'Name' }]} data={[]} />
        <LoadingMessage />
        <ErrorMessage />
        <ModalStatusBox type="error" message="Failed." onClose={noop} />
      </>,
      { locale: 'en' },
    );
    expect(screen.getByText('No data.')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Please wait')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something went wrongAn unknown error occurred.',
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(hangulLeft()).toEqual([]);
  });

  it('수정 충돌 안내: 제목, 설명의 대상, 버튼', () => {
    renderWithProviders(<ConflictDialog subject="BOM" onClose={noop} onReload={noop} />, {
      locale: 'en',
    });
    const dialog = screen.getByRole('alertdialog', { name: 'Edit conflict' });
    expect(dialog).toHaveAccessibleDescription(/Another user has already changed this BOM/);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load latest data' })).toHaveFocus();
    expect(hangulLeft()).toEqual([]);
  });

  it('추이 그래프 요약', () => {
    renderWithProviders(<Sparkline data={[10, 30, 20]} label="Revenue trend" />, {
      locale: 'en',
    });
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Revenue trend: start 10, end 20, low 10, high 30',
    );
  });

  it('검색 막대와 빈 드롭다운', async () => {
    renderWithProviders(
      <>
        <SearchBar options={[]} onTypeChange={noop} onKeywordSearch={noop} />
        <Dropdown placeholder="Status" items={[]} value="" />
      </>,
      { locale: 'en' },
    );
    expect(screen.getByRole('combobox', { name: 'Search type' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter a keyword')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    expect(screen.getByRole('option', { name: 'No items' })).toBeInTheDocument();
    expect(hangulLeft()).toEqual([]);
  });

  it('입력 팝업의 확인 버튼과 공정 목록', async () => {
    const { unmount } = renderWithProviders(
      <DropdownInputModal placeholder="Memo" onSubmit={vi.fn()} />,
      { locale: 'en' },
    );
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    unmount();

    renderWithProviders(<DropdownInputListModal onSubmit={vi.fn()} />, { locale: 'en' });
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('heading', { name: 'Process steps' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add step' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    expect(hangulLeft()).toEqual([]);
  });
});

describe('@everp/ui 한국어 문구는 예전과 같다', () => {
  // HEAD~1 의 각 컴포넌트에 있던 원문을 직접 고정한다.
  it('로딩, 오류, 쪽 넘김, 표와 모달의 한국어 원문을 유지한다', () => {
    renderWithProviders(
      <>
        <LoadingMessage />
        <ErrorMessage />
        <SimplePagination currentPage={2} totalPages={3} onPageChange={noop} />
        <Table columns={[{ key: 'a', label: 'A' }]} data={[]} />
        <ModalStatusBox type="error" message="실패" onClose={noop} />
      </>,
      { locale: 'ko' },
    );
    for (const literal of [
      '로딩 중...',
      '잠시만 기다려주세요',
      '오류가 발생했습니다',
      '알 수 없는 오류가 발생했습니다.',
      '데이터가 없습니다.',
      '실패',
    ]) {
      expect(screen.getByText(literal, { exact: true }).textContent).toBe(literal);
    }
    for (const literal of ['이전', '다음', '닫기']) {
      expect(screen.getByRole('button', { name: literal }).textContent).toBe(literal);
    }
  });

  it('공정 목록의 한국어 원문을 유지한다', () => {
    renderWithProviders(<InputList />, { locale: 'ko' });
    expect(screen.getByRole('heading', { name: '공정 순서 입력' }).textContent).toBe(
      '공정 순서 입력',
    );
    expect(screen.getByRole('button', { name: '공정 추가' }).textContent).toBe('공정 추가');
  });

  it('검색 placeholder 와 빈 드롭다운의 한국어 원문을 유지한다', async () => {
    renderWithProviders(<SearchBar options={[]} onTypeChange={noop} onKeywordSearch={noop} />, {
      locale: 'ko',
    });
    const type = screen.getByRole('combobox', { name: '검색 타입' });
    expect(type.textContent).toBe('검색 타입');
    expect(screen.getByPlaceholderText('검색어 입력')).toHaveAttribute(
      'placeholder',
      '검색어 입력',
    );
    await userEvent.click(type);
    expect(screen.getByRole('option', { name: '항목 없음' }).textContent).toBe('항목 없음');
  });

  // useId 가 렌더마다 달라 id 와 그것을 가리키는 속성은 지운다
  const html = () =>
    document.body.innerHTML.replace(
      / (id|aria-labelledby|aria-describedby|aria-controls)="[^"]*"/g,
      '',
    );

  const SAMPLES: [string, () => ReactElement][] = [
    [
      'Pagination',
      () => <Pagination currentPage={1} totalPages={8} totalElements={1234} onPageChange={noop} />,
    ],
    [
      'SimplePagination',
      () => <SimplePagination currentPage={1} totalPages={3} onPageChange={noop} />,
    ],
    ['Table', () => <Table columns={[{ key: 'a', label: 'A' }]} data={[]} />],
    ['LoadingMessage', () => <LoadingMessage />],
    ['ErrorMessage', () => <ErrorMessage />],
    ['ModalStatusBox', () => <ModalStatusBox type="error" message="실패" onClose={noop} />],
    ['ConflictDialog', () => <ConflictDialog subject="BOM" onClose={noop} onReload={noop} />],
    ['Sparkline', () => <Sparkline data={[1000, 2500, 1500]} label="매출 추이" />],
    ['SearchBar', () => <SearchBar options={[]} onTypeChange={noop} onKeywordSearch={noop} />],
  ];

  it.each(SAMPLES)('%s: 앱 메시지로 그린 것과 패키지 기본값이 같다', (_, make) => {
    render(make());
    const before = html();
    cleanup();

    render(<IntlTestProvider>{make()}</IntlTestProvider>);
    expect(html()).toBe(before);
    expect(before).toMatch(HANGUL);
  });

  // 열어야 보이는 글자. 팝업은 body 에 붙어 body 전체를 비교한다
  const OPENED: [string, 'combobox' | 'button', () => ReactElement][] = [
    ['Dropdown', 'combobox', () => <Dropdown placeholder="상태" items={[]} value="" />],
    [
      'DropdownInputModal',
      'button',
      () => <DropdownInputModal placeholder="메모" onSubmit={noop} />,
    ],
    ['DropdownInputListModal', 'button', () => <DropdownInputListModal onSubmit={noop} />],
  ];

  it.each(OPENED)('%s: 연 뒤의 글자도 같다', async (_, role, make) => {
    const open = async (wrap: boolean) => {
      render(wrap ? <IntlTestProvider>{make()}</IntlTestProvider> : make());
      await userEvent.click(screen.getByRole(role));
      const out = html();
      cleanup();
      return out;
    };
    const before = await open(false);
    expect(await open(true)).toBe(before);
    expect(before).toMatch(HANGUL);
  });
});
