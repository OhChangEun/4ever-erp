import type { Schema } from '@/lib/api/contract';

export type SupplyFlow = Schema<'SupplyFlow'>;
export type FlowNode = SupplyFlow['nodes'][number];
export type FlowLink = SupplyFlow['links'][number];
