import type { Schema } from '@/lib/api/contract';
import { type PageRequest } from '@/app/types/Page';

export type BomListResponse = Schema<'BomListResponse'>;

export type BomListRequestParams = PageRequest;
