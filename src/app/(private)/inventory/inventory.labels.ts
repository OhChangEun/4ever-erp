'use client';

import { useTranslations } from 'next-intl';
import type ko from '@/i18n/messages/inventory/ko.json';
import { WAREHOUSE_MATERIAL_ALIASES } from './inventory.constants';

type LabelKey = keyof typeof ko.labels;

// 응답은 게이트웨이가 프록시하고 계약은 string이다. 알려진 별칭만 표시용으로 해석한다.
const CATEGORY_KEYS: Partial<Record<string, LabelKey>> = {
  MATERIAL: 'CATEGORY_MATERIAL',
  RAW_MATERIAL: 'CATEGORY_MATERIAL',
  RAW: 'CATEGORY_MATERIAL',
  ITEM: 'CATEGORY_ITEM',
  ETC: 'CATEGORY_ETC',
  MOTOR: 'CATEGORY_MOTOR',
  BEARING: 'CATEGORY_BEARING',
};
const WAREHOUSE_KEYS: Partial<Record<string, LabelKey>> = {
  MATERIAL: 'WAREHOUSE_MATERIAL',
  ...Object.fromEntries(
    WAREHOUSE_MATERIAL_ALIASES.map((alias): [string, LabelKey] => [alias, 'WAREHOUSE_MATERIAL']),
  ),
  ITEM: 'WAREHOUSE_ITEM',
  PRODUCT: 'WAREHOUSE_PRODUCT',
  ETC: 'WAREHOUSE_ETC',
};

export function useInventoryLabels() {
  const t = useTranslations('inventory.labels');
  return {
    hasCategoryLabel: (value: string) => CATEGORY_KEYS[value] !== undefined,
    categoryLabel: (value: string) => {
      const key = CATEGORY_KEYS[value];
      return key ? t(key) : value;
    },
    warehouseTypeLabel: (value: string) => {
      const key = WAREHOUSE_KEYS[value];
      return key ? t(key) : value;
    },
  };
}
