import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useIsClient, useMediaQuery } from './useMediaQuery';

const installMatchMedia = (initial: boolean) => {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }));
  return {
    set: (next: boolean) => {
      matches = next;
      listeners.forEach((cb) => cb());
    },
  };
};

describe('useMediaQuery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('현재 일치 여부를 읽고, 바뀌면 따라간다', () => {
    const media = installMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 1023px)'));
    expect(result.current).toBe(false);
    act(() => media.set(true));
    expect(result.current).toBe(true);
  });

  it('matchMedia 가 없는 환경이면 false', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useMediaQuery('(max-width: 1023px)'));
    expect(result.current).toBe(false);
  });
});

describe('useIsClient', () => {
  it('브라우저 렌더에서는 true', () => {
    const { result } = renderHook(() => useIsClient());
    expect(result.current).toBe(true);
  });
});
