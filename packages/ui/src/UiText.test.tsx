import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Pagination from './Pagination';
import Table from './Table';
import { UiTextProvider, defaultUiText, type UiText } from './UiText';

// 앱 없이 쓰는 쪽이 Provider 로 글자를 바꾸는 모양(번역 라이브러리 없이)
const english: UiText = {
  ...defaultUiText,
  pagination: {
    label: 'Pagination',
    previous: 'Previous page',
    next: 'Next page',
    total: (count, emphasize) => <>Total {emphasize(count)}</>,
  },
  table: { empty: 'No data.' },
};

describe('UiText', () => {
  it('Provider 가 없으면 한국어 기본값', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={2}
        totalElements={7}
        onPageChange={() => undefined}
      />,
    );
    expect(screen.getByRole('navigation', { name: '페이지' })).toHaveTextContent('총 7건');
    expect(screen.getByRole('button', { name: '이전 페이지' })).toBeDisabled();
  });

  it('Provider 가 넘긴 글자로 그리고, 호출부가 넘긴 글자가 기본값보다 앞선다', () => {
    render(
      <UiTextProvider text={english}>
        <Pagination
          currentPage={1}
          totalPages={2}
          totalElements={7}
          onPageChange={() => undefined}
        />
        <Table columns={[{ key: 'a', label: 'A' }]} data={[]} />
        <Table columns={[{ key: 'a', label: 'A' }]} data={[]} emptyMessage="Nothing here" />
      </UiTextProvider>,
    );
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Total 7');
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    expect(screen.getByText('No data.')).toBeInTheDocument();
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
