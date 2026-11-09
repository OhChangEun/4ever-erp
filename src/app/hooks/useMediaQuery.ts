import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => undefined;

/**
 * 미디어 쿼리 일치 여부. 서버 렌더와 첫 하이드레이션은 false 로 맞추고, 그 뒤 브라우저 값을 따른다.
 * 예전엔 레이아웃마다 마운트 플래그와 resize 리스너를 effect 로 state 에 넣었다(R02).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false),
    () => false,
  );
}

/** 브라우저에서 렌더 중인지. 포털처럼 document 가 필요한 곳에 쓴다(서버 렌더와 첫 하이드레이션은 false) */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
