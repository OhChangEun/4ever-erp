'use client';

import type { ReactNode } from 'react';
import DomainMessages from '@/i18n/DomainMessages';
import ko from '@/i18n/messages/sales/ko.json';

// 영어는 고를 때만 받는다. 모듈 밖에 둬서 렌더마다 새 함수가 생기지 않게
const LOAD = { en: () => import('@/i18n/messages/sales/en.json') };

/** 영업 화면 메시지(i18n 8). useTranslations('sales') 로 꺼낸다. 영업 모달을 여는 대시보드 레이아웃도 감싼다(sales/ui 로 공개) */
export default function SalesMessages({ children }: { children: ReactNode }) {
  return (
    <DomainMessages namespace="sales" ko={ko} load={LOAD}>
      {children}
    </DomainMessages>
  );
}
