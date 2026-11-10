'use client';

import type { ReactNode } from 'react';
import DomainMessages from '@/i18n/DomainMessages';
import ko from '@/i18n/messages/inventory/ko.json';

// 영어는 고를 때만 받는다. 모듈 밖에 둬서 렌더마다 새 함수가 생기지 않게
const LOAD = { en: () => import('@/i18n/messages/inventory/en.json') };

/**
 * 재고 화면 메시지(i18n 6). useTranslations('inventory') 로 꺼낸다.
 * 재고 모달을 여는 다른 화면(창고의 재고 상세, 안전재고의 발주 요청)도 레이아웃에서 이걸 감싼다
 */
export default function InventoryMessages({ children }: { children: ReactNode }) {
  return (
    <DomainMessages namespace="inventory" ko={ko} load={LOAD}>
      {children}
    </DomainMessages>
  );
}
