'use client';

import type { ReactNode } from 'react';
import DomainMessages from '@/i18n/DomainMessages';
import ko from '@/i18n/messages/production/ko.json';

// 영어는 고를 때만 받는다. 모듈 밖에 둬서 렌더마다 새 함수가 생기지 않게
const LOAD = { en: () => import('@/i18n/messages/production/en.json') };

/** 생산 화면 메시지(i18n 9). useTranslations('production') 로 꺼낸다. 다른 화면이 생산 UI 를 쓰지 않아 생산 레이아웃만 감싼다 */
export default function ProductionMessages({ children }: { children: ReactNode }) {
  return (
    <DomainMessages namespace="production" ko={ko} load={LOAD}>
      {children}
    </DomainMessages>
  );
}
