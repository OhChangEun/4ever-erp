'use client';

import type { ReactNode } from 'react';
import DomainMessages from '@/i18n/DomainMessages';
import ko from '@/i18n/messages/profile/ko.json';

// 영어는 고를 때만 받는다. 모듈 밖에 둬서 렌더마다 새 함수가 생기지 않게
const LOAD = { en: () => import('@/i18n/messages/profile/en.json') };

/**
 * 내 프로필 화면 메시지(i18n 11). useTranslations('myProfile') 로 꺼낸다.
 * 공통 메시지에 헤더와 사이드바 프로필 메뉴용 'profile' 이 이미 있어 이름을 달리했다(같으면 덮어써 사이드바 메뉴 글자가 사라진다)
 */
export default function ProfileMessages({ children }: { children: ReactNode }) {
  return (
    <DomainMessages namespace="myProfile" ko={ko} load={LOAD}>
      {children}
    </DomainMessages>
  );
}
