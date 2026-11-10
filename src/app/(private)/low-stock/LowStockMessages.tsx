'use client';

import type { ReactNode } from 'react';
import DomainMessages from '@/i18n/DomainMessages';
import ko from '@/i18n/messages/lowStock/ko.json';

// 영어는 고를 때만 받는다. 모듈 밖에 둬서 렌더마다 새 함수가 생기지 않게
const LOAD = { en: () => import('@/i18n/messages/lowStock/en.json') };

/** 안전재고 화면 메시지(i18n 6). useTranslations('lowStock') 로 꺼낸다 */
export default function LowStockMessages({ children }: { children: ReactNode }) {
  return (
    <DomainMessages namespace="lowStock" ko={ko} load={LOAD}>
      {children}
    </DomainMessages>
  );
}
