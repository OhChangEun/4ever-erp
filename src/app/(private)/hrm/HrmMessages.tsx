'use client';

import type { ReactNode } from 'react';
import DomainMessages from '@/i18n/DomainMessages';
import ko from '@/i18n/messages/hrm/ko.json';

// 영어는 고를 때만 받는다. 모듈 밖에 둬서 렌더마다 새 함수가 생기지 않게
const LOAD = { en: () => import('@/i18n/messages/hrm/en.json') };

/** 인사 화면 메시지(i18n 7). useTranslations('hrm') 로 꺼낸다. 다른 화면이 인사 UI 를 쓰지 않아 인사 레이아웃만 감싼다 */
export default function HrmMessages({ children }: { children: ReactNode }) {
  return (
    <DomainMessages namespace="hrm" ko={ko} load={LOAD}>
      {children}
    </DomainMessages>
  );
}
