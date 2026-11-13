import type { Schema } from '@/lib/api/contract';

export type FinanceMonthly = Schema<'FinanceMonthly'>;
export type MonthlyPoint = FinanceMonthly['months'][number];
export type ArAging = Schema<'ArAging'>;
export type AgingBucket = ArAging['buckets'][number];
