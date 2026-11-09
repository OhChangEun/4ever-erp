'use client';

import { FloatingPortal } from '@floating-ui/react';
import { createContext, useContext, type ReactNode } from 'react';

/**
 * 팝업(드롭다운 목록, 달력)을 붙일 곳. 모달 안이면 모달 틀이 자기 요소를 넣어 준다.
 * Radix 모달은 열리면 body 에 pointer-events: none 을 걸고, 모달 밖 요소를 aria-hidden 으로 가리고,
 * 포커스를 모달 안에 가둔다. body 로 붙은 팝업은 셋 다 걸려 누를 수도, 포커스할 수도 없다(접근성 2 리뷰 P1).
 */
export const PopoverRootContext = createContext<HTMLElement | null>(null);

/** 모달 안의 팝업 층에 붙는 표시. 모달 틀이 Esc 를 받으면 이 층이 있는지 보고 먼저 닫게 둔다 */
export const NESTED_LAYER_SELECTOR = '[data-floating-ui-portal], [role="alertdialog"]';

export default function PopoverPortal({ children }: { children: ReactNode }) {
  const root = useContext(PopoverRootContext);
  // root 가 없으면(모달 밖) floating-ui 기본값인 body 로
  return <FloatingPortal root={root ?? undefined}>{children}</FloatingPortal>;
}
