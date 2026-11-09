import type { Schema } from '@/lib/api/contract';

// 구매 지표 api 응답 데이터 구조
export type PurchaseStat = Schema<'PurchaseStat'>;
export type PurchaseStatResponse = Schema<'PurchaseStatResponse'>;

// 공급사 통계 카드 type
export type SupplierPurchaseStat = Schema<'SupplierPurchaseStat'>;
export type SupplierPurchaseStatResponse = Schema<'SupplierPurchaseStatResponse'>;
