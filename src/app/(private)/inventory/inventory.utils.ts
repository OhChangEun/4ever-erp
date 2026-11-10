/** 이동 응답 형식은 게이트웨이에서 확정할 수 없어 코드와 한국어를 모두 해석한다. */
export const MOVEMENT_TYPE = { IN: '입고', OUT: '출고', MOVE: '이동' } as const;

export const getMovementType = (type: string) => {
  switch (type) {
    case 'IN':
      return MOVEMENT_TYPE.IN;
    case 'OUT':
      return MOVEMENT_TYPE.OUT;
    case 'MOVE':
    case 'TRANSFER':
      return MOVEMENT_TYPE.MOVE;
    default:
      return type;
  }
};

export const getMovementIcon = (type: string) => {
  const icons: Partial<Record<string, string>> = {
    [MOVEMENT_TYPE.IN]: 'ri-arrow-down-line',
    [MOVEMENT_TYPE.OUT]: 'ri-arrow-up-line',
    [MOVEMENT_TYPE.MOVE]: 'ri-arrow-left-right-line',
  };
  return icons[getMovementType(type)] ?? '';
};

export const getMovementColor = (type: string) => {
  const colors: Partial<Record<string, string>> = {
    [MOVEMENT_TYPE.IN]: 'text-green-600 bg-green-100',
    [MOVEMENT_TYPE.OUT]: 'text-red-600 bg-red-100',
    [MOVEMENT_TYPE.MOVE]: 'text-blue-600 bg-blue-100',
  };
  return colors[getMovementType(type)] ?? '';
};

export const FormatDate = (date: string) => {
  return date.replace('T', ' ').slice(0, 16);
};
