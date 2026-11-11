'use client';

import { useTranslations } from 'next-intl';
import type { KeyValueItem } from '@/app/types/CommonType';
import { SUPPLIER_CATEGORIES } from './purchase.schemas';
import type { SupplierCategory } from './types/SupplierType';

// 응답 스키마와 같은 코드 목록. 메시지 purchase.common.supplierCategory 의 키와 같다(tsc 가 본다)
const isSupplierCategory = (code: string): code is SupplierCategory =>
  SUPPLIER_CATEGORIES.some((category) => category === code);

/**
 * 공급업체 카테고리 코드(MATERIAL)의 화면 글자. 목록, 상세, 필터, 폼이 같이 쓴다. 서버로 보내는 값은 코드다.
 * 드롭다운 옵션은 서버가 글자까지 주지만 아는 코드는 메시지 글자로 덮는다(목록과 같은 글자, 영어 화면).
 * 모르는 코드의 옵션은 서버 글자 그대로 둔다.
 */
export function useSupplierCategoryLabels() {
  const t = useTranslations('purchase.common.supplierCategory');
  return {
    categoryLabel: (code: SupplierCategory) => t(code),
    categoryOptions: (options: KeyValueItem[]): KeyValueItem[] =>
      options.map((option) =>
        isSupplierCategory(option.key) ? { key: option.key, value: t(option.key) } : option,
      ),
  };
}
