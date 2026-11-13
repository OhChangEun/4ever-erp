'use client';

import { SEGMENT_ACTIVE, SEGMENT_TRACK, segmentItem } from './segment';

interface TabButtonItem {
  id: string;
  name: string;
}

interface TabButtonsProps {
  /** 묶음 이름. 낭독기가 무엇을 고르는 묶음인지 읽는다(예: "출고 관리 탭") */
  label: string;
  tabs: TabButtonItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

/**
 * 세그먼트(서브탭). 툴바 왼쪽에 둔다. 아이콘은 받지 않는다(디자인 지침 12장 아이콘).
 * 모양은 기간 선택(SlidingNavBar)과 같다(segment.ts). 선택은 흰 칸과 함께 aria-pressed 로 알린다.
 * 포커스 링은 전역 :focus-visible(tokens.css)
 */
export default function TabButtons({ label, tabs, activeTab, onTabChange }: TabButtonsProps) {
  return (
    <div role="group" aria-label={label} className={SEGMENT_TRACK}>
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onTabChange(tab.id)}
            className={`${segmentItem(selected)} ${selected ? SEGMENT_ACTIVE : 'border border-transparent'}`}
          >
            {tab.name}
          </button>
        );
      })}
    </div>
  );
}
