/**
 * 세그먼트 한 모양(디자인 지침 12장). 서브탭(TabButtons)과 기간 선택(SlidingNavBar)이 같이 쓴다.
 * 회색 바탕 칸에 흰 활성 칸, 그림자 없음. 활성 칸을 브랜드 블루로 채우지 않는다(옆 primary 버튼과 헷갈린다)
 */
export const SEGMENT_TRACK = 'inline-flex items-center bg-gray-100 rounded-md p-0.5';
export const SEGMENT_ACTIVE = 'bg-white border border-gray-200';

export const segmentItem = (selected: boolean) =>
  `whitespace-nowrap cursor-pointer rounded px-2.5 h-7 text-xs transition-colors ${
    selected ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-800'
  }`;
