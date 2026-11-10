/**
 * 재고 이동 유형. 서버가 한국어 값 그대로 보낸다(화면 문구가 아니라 코드다).
 * 글자는 공통 메시지 status.<값> 으로 StatusLabel 이 바꾼다
 */
export const MOVEMENT_TYPE = { IN: '입고', OUT: '출고', MOVE: '이동' } as const;

export const getMovementIcon = (type: string) => {
  const icons: Partial<Record<string, string>> = {
    [MOVEMENT_TYPE.IN]: 'ri-arrow-down-line',
    [MOVEMENT_TYPE.OUT]: 'ri-arrow-up-line',
    [MOVEMENT_TYPE.MOVE]: 'ri-arrow-left-right-line',
  };
  return icons[type] ?? '';
};

export const getMovementColor = (type: string) => {
  const colors: Partial<Record<string, string>> = {
    [MOVEMENT_TYPE.IN]: 'text-green-600 bg-green-100',
    [MOVEMENT_TYPE.OUT]: 'text-red-600 bg-red-100',
    [MOVEMENT_TYPE.MOVE]: 'text-blue-600 bg-blue-100',
  };
  return colors[type] ?? '';
};

export const FormatDate = (date: string) => {
  return date.replace('T', ' ').slice(0, 16);
};
