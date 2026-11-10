import { WAREHOUSE_MATERIAL_ALIASES } from '@/app/(private)/inventory';

// 창고 등록과 수정 요청이 받는 유형. 팀 백엔드 WarehouseCreateRequestDto, WarehouseUpdateRequestDto 의
// 주석이 MATERIAL, ITEM, ETC 다. 등록과 수정 폼이 이 목록 하나를 같이 쓴다
export type WarehouseTypeOption = 'MATERIAL' | 'ITEM' | 'ETC';
export const WAREHOUSE_TYPE_OPTIONS: readonly WarehouseTypeOption[] = ['MATERIAL', 'ITEM', 'ETC'];
// 등록 폼 초기값. select 가 처음 보이는 옵션과 같아야 한다(빈 문자열이면 화면은 원자재인데 빈 값을 보냈다)
export const DEFAULT_WAREHOUSE_TYPE: WarehouseTypeOption = 'MATERIAL';

// 조회 응답은 계약상 string 이라 원자재 창고가 RAW, RAW_MATERIAL 로 올 수 있다(목 응답이 RAW).
// 별칭 표는 재고 도메인 한 곳이다. 표시 라벨이 원자재창고로 보는 값만 요청 코드 MATERIAL 로 옮긴다
/** 수정 폼 초기값. 별칭이 아니고 목록에도 없는 값은 바꾸지 않는다(폼이 그 값을 옵션으로 하나 더 보인다) */
export const toWarehouseRequestType = (value: string): string =>
  WAREHOUSE_MATERIAL_ALIASES.includes(value) ? 'MATERIAL' : value;

export const isWarehouseTypeOption = (value: string): value is WarehouseTypeOption =>
  WAREHOUSE_TYPE_OPTIONS.some((option) => option === value);
