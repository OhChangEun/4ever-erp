import type hrmKo from '@/i18n/messages/hrm/ko.json';

/**
 * 교육 프로그램 추가 모달의 대상 부서와 직급. value 는 서버로 보내는 값이라 한국어 그대로 둔다(화면 글자는 hrm.programs.*Options.<key>)
 */
export const PROGRAM_TARGET_DEPARTMENTS: {
  key: keyof typeof hrmKo.programs.departmentOptions;
  value: string;
}[] = [
  { key: 'dev', value: '개발팀' },
  { key: 'marketing', value: '마케팅팀' },
  { key: 'sales', value: '영업팀' },
  { key: 'hr', value: '인사팀' },
  { key: 'finance', value: '재무팀' },
  { key: 'inventory', value: '재고팀' },
];

export const PROGRAM_TARGET_POSITIONS: {
  key: keyof typeof hrmKo.programs.positionOptions;
  value: string;
}[] = [
  { key: 'staff', value: '사원' },
  { key: 'assistantManager', value: '대리' },
  { key: 'manager', value: '과장' },
  { key: 'deputyGeneralManager', value: '차장' },
  { key: 'generalManager', value: '부장' },
];
