'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { koreanObjectParticle } from './koreanObjectParticle';

/**
 * 컴포넌트가 스스로 그리는 글자(aria 이름, 빈 줄, 버튼 글자, 기본 placeholder).
 * 패키지는 번역 라이브러리를 모른다. 쓰는 쪽이 UiTextProvider 로 이 모양의 값을 한 번 넘긴다.
 * props 로 받지 않는 이유: Pagination 25곳, Table 23곳처럼 호출부가 많아 화면마다 같은 글자를 넘겨야 한다.
 * Provider 가 없으면 한국어 기본값(defaultUiText)을 쓴다. Storybook, 패키지 테스트, 다른 앱이 그대로 돈다.
 * 값을 받아 문장을 만드는 글자는 함수다. 어순이 언어마다 달라 앞뒤 조각으로 나누지 않는다.
 */
export interface UiText {
  close: string;
  confirm: string;
  pagination: {
    label: string;
    previous: string;
    next: string;
    /** 총 건수. 숫자는 emphasize 로 감싸야 굵게 보인다 */
    total: (count: number, emphasize: (chunks: ReactNode) => ReactNode) => ReactNode;
  };
  simplePagination: { previous: string; next: string };
  table: { empty: string };
  dropdown: { empty: string };
  searchBar: { typePlaceholder: string; keywordPlaceholder: string };
  loading: { message: string; subMessage: string };
  error: { title: string; unknown: string };
  conflict: {
    title: string;
    /** subject: 무엇이 충돌했는지(호출부가 넘긴 글자 그대로) */
    description: (subject: string) => string;
    hint: string;
    reload: string;
  };
  sparkline: {
    /** 숫자는 이미 자릿수 구분을 넣은 글자다 */
    summary: (
      label: string,
      values: { start: string; end: string; min: string; max: string },
    ) => string;
  };
  inputList: {
    title: string;
    add: string;
    /** 삭제 버튼 이름. 줄마다 달라야 낭독기가 구분한다. position 은 화면에 보이는 1부터의 순번이다 */
    remove: (position: number) => string;
    /** 입력칸 이름. position 은 remove 와 같다 */
    item: (position: number) => string;
  };
  dropdownInputModal: { open: string };
  dropdownInputListModal: { open: string };
}

export const defaultUiText: UiText = {
  close: '닫기',
  confirm: '확인',
  pagination: {
    label: '페이지',
    previous: '이전 페이지',
    next: '다음 페이지',
    total: (count, emphasize) => <>총 {emphasize(count)}건</>,
  },
  simplePagination: { previous: '이전', next: '다음' },
  table: { empty: '데이터가 없습니다.' },
  dropdown: { empty: '항목 없음' },
  searchBar: { typePlaceholder: '검색 타입', keywordPlaceholder: '검색어 입력' },
  loading: { message: '로딩 중...', subMessage: '잠시만 기다려주세요' },
  error: { title: '오류가 발생했습니다', unknown: '알 수 없는 오류가 발생했습니다.' },
  conflict: {
    title: '수정 충돌이 발생했습니다',
    description: (subject) =>
      `다른 사용자가 이미 이 ${subject}${koreanObjectParticle(subject)} 수정했습니다. 현재 화면의 데이터가 오래되어 수정 요청이 거부됐습니다.`,
    hint: '최신 데이터를 불러온 후 다시 시도해 주세요.',
    reload: '최신 데이터 불러오기',
  },
  sparkline: {
    summary: (label, { start, end, min, max }) =>
      `${label}: 시작 ${start}, 끝 ${end}, 최저 ${min}, 최고 ${max}`,
  },
  inputList: {
    title: '공정 순서 입력',
    add: '공정 추가',
    remove: (position) => `항목 ${position} 삭제`,
    item: (position) => `${position}번 항목`,
  },
  dropdownInputModal: { open: '입력 창 열기' },
  dropdownInputListModal: { open: '목록 입력 창 열기' },
};

const UiTextContext = createContext<UiText>(defaultUiText);

export function UiTextProvider({ text, children }: { text: UiText; children: ReactNode }) {
  return <UiTextContext value={text}>{children}</UiTextContext>;
}

export const useUiText = () => useContext(UiTextContext);
