import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SimplePagination from './SimplePagination';

describe('SimplePagination', () => {
  it.each([
    { name: '이전', expectedPage: 1 },
    { name: '다음', expectedPage: 3 },
  ])('폼 안에서 $name 페이지로 이동해도 제출하지 않는다', async ({ name, expectedPage }) => {
    const onPageChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <SimplePagination currentPage={2} totalPages={3} onPageChange={onPageChange} />
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name }));

    expect(onPageChange).toHaveBeenCalledExactlyOnceWith(expectedPage);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
