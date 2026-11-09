import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDismissibleError } from './useDismissibleError';

describe('useDismissibleError', () => {
  it('오류가 나면 열리고, 닫으면 닫힌다', () => {
    const { result, rerender } = renderHook(({ isError }) => useDismissibleError(isError), {
      initialProps: { isError: false },
    });
    expect(result.current.isOpen).toBe(false);
    rerender({ isError: true });
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.isOpen).toBe(false);
  });

  it('오류가 풀렸다가 다시 나면 다시 열린다', () => {
    const { result, rerender } = renderHook(({ isError }) => useDismissibleError(isError), {
      initialProps: { isError: true },
    });
    act(() => result.current.dismiss());
    rerender({ isError: false });
    rerender({ isError: true });
    expect(result.current.isOpen).toBe(true);
  });
});
