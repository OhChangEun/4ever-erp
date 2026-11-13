'use client';

import { useTranslations } from 'next-intl';
import type { KeyValueItem } from '@/app/types/CommonType';
import { isStatusKey } from '@/lib/status.constants';

/**
 * 서버가 코드와 글자를 같이 주는 드롭다운 옵션(상태 필터, 검색 타입)의 화면 글자(남은 한국어 문자열 카드).
 * 아는 코드는 메시지 글자로 덮고 모르는 코드는 서버 글자 그대로 둔다(공급업체 카테고리와 같은 규칙). 서버로 가는 값(key)은 그대로다.
 * labels 에 있는 코드는 그 글자, 상태 코드는 status 메시지(StatusLabel 과 같은 글자).
 * 서버 데이터 드롭다운(부서, 제품 이름)에는 쓰지 않는다.
 */
export const useOptionLabels = () => {
  const t = useTranslations('status');
  return (options: KeyValueItem[], labels: Partial<Record<string, string>> = {}): KeyValueItem[] =>
    options.map(({ key, value }) => ({
      key,
      value: labels[key] ?? (isStatusKey(key) ? t(key) : value),
    }));
};
