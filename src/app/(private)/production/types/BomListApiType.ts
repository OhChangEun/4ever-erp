import type { Schema } from '@/lib/api/contract';
import { PageRequest } from '@/app/types/Page';

export type BomListData = Schema<'BomListData'>;
export type BomListResponse = Schema<'BomListResponse'>;

export type BomListRequestParams = PageRequest;
