'use client';

import { useTranslations } from 'next-intl';
import salesKo from '@/i18n/messages/sales/ko.json';

// 글자는 sales.common.uom. 코드 목록은 주석 처리된 게이트웨이 목 UOM_NAMES(EA, KG, M, L, SET)를 참고했다(응답 근거 아님)
type UomCode = keyof typeof salesKo.common.uom;
const UOM_CODES: ReadonlySet<string> = new Set(Object.keys(salesKo.common.uom));
const isUomCode = (code: string): code is UomCode => UOM_CODES.has(code);

/**
 * 영업 화면의 코드 표시 글자. 표시만 바꾸고 서버에 보내는 값은 코드 그대로다.
 * uomLabel: 단위 코드(EA)를 화면 글자(개, pcs)로. 모르는 코드는 숨기지 않고 코드 그대로 보인다.
 */
export function useSalesLabels() {
  const t = useTranslations('sales.common.uom');
  return {
    uomLabel: (code: string) => (isUomCode(code) ? t(code) : code),
  };
}
