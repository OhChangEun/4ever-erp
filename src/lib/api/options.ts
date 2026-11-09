import type { KeyValueItem } from '@/app/types/CommonType';
import type { OptionResponse } from '@/app/types/api';

/**
 * 드롭다운 옵션 응답(API 층의 OptionResponse)을 화면 옵션(KeyValueItem)으로 바꾸는 한 곳.
 * 지금은 모양이 같지만, 서버 필드 이름이 바뀌면 여기만 고친다(계획 7절, 타입 3차 카드).
 * useDropdown 과 옵션을 직접 조회하는 곳이 useQuery 의 select 로 쓴다.
 */
export const toKeyValueItems = (options: OptionResponse[]): KeyValueItem[] =>
  options.map(({ key, value }) => ({ key, value }));
