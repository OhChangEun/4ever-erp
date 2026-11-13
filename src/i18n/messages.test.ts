import { describe, expect, it } from 'vitest';
import ko from './messages/ko.json';
import en from './messages/en.json';
import financeKo from './messages/finance/ko.json';
import financeEn from './messages/finance/en.json';
import warehouseKo from './messages/warehouse/ko.json';
import warehouseEn from './messages/warehouse/en.json';
import dashboardKo from './messages/dashboard/ko.json';
import dashboardEn from './messages/dashboard/en.json';
import purchaseKo from './messages/purchase/ko.json';
import purchaseEn from './messages/purchase/en.json';
import inventoryKo from './messages/inventory/ko.json';
import inventoryEn from './messages/inventory/en.json';
import lowStockKo from './messages/lowStock/ko.json';
import lowStockEn from './messages/lowStock/en.json';
import hrmKo from './messages/hrm/ko.json';
import hrmEn from './messages/hrm/en.json';
import salesKo from './messages/sales/ko.json';
import salesEn from './messages/sales/en.json';
import productionKo from './messages/production/ko.json';
import productionEn from './messages/production/en.json';
import profileKo from './messages/profile/ko.json';
import profileEn from './messages/profile/en.json';

// 공통과 도메인 메시지 쌍. 도메인을 옮길 때마다 여기 더한다
const PAIRS: [string, object, object][] = [
  ['common', ko, en],
  ['finance', financeKo, financeEn],
  ['warehouse', warehouseKo, warehouseEn],
  ['dashboard', dashboardKo, dashboardEn],
  ['purchase', purchaseKo, purchaseEn],
  ['inventory', inventoryKo, inventoryEn],
  ['lowStock', lowStockKo, lowStockEn],
  ['hrm', hrmKo, hrmEn],
  ['sales', salesKo, salesEn],
  ['production', productionKo, productionEn],
  ['profile', profileKo, profileEn],
];

/** 메시지 키를 모은다(중첩은 점으로) */
const keysOf = (tree: object, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]: [string, unknown]) =>
    typeof value === 'object' && value !== null
      ? keysOf(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

describe('언어별 메시지(i18n 1, 2)', () => {
  it.each(PAIRS)('%s: ko 와 en 의 키가 같다(한쪽에만 있는 문구가 없다)', (_, koTree, enTree) => {
    expect(keysOf(enTree).sort()).toEqual(keysOf(koTree).sort());
  });

  // 남은 한국어 문자열 카드: 영어 화면은 en 값을 그린다. status 의 한국어 키(입고, 퇴근완료)는 키라 괜찮고 값만 본다
  it('en 메시지 값에 한글이 없다(언어 이름 한국어 제외)', () => {
    const valueOf = (tree: object, key: string): unknown =>
      key
        .split('.')
        .reduce<unknown>(
          (node, part) =>
            typeof node === 'object' && node !== null ? Reflect.get(node, part) : undefined,
          tree,
        );
    // 언어 고르기 버튼은 언어마다 자기 이름으로 보인다(영어 화면에서도 '한국어')
    const KOREAN_ON_PURPOSE = ['common:profile.korean'];
    const found = PAIRS.flatMap(([name, , enTree]) =>
      keysOf(enTree)
        .filter((key) => /[가-힣]/.test(String(valueOf(enTree, key))))
        .map((key) => `${name}:${key}`),
    ).filter((key) => !KOREAN_ON_PURPOSE.includes(key));
    expect(found).toEqual([]);
  });

  it('빈 문구가 없다', () => {
    const empty = (tree: object) =>
      keysOf(tree).filter((key) => {
        const value: unknown = key
          .split('.')
          .reduce<unknown>(
            (node, part) =>
              typeof node === 'object' && node !== null ? Reflect.get(node, part) : undefined,
            tree,
          );
        return typeof value !== 'string' || value.trim() === '';
      });
    for (const [, koTree, enTree] of PAIRS) {
      expect(empty(koTree)).toEqual([]);
      expect(empty(enTree)).toEqual([]);
    }
  });
});
