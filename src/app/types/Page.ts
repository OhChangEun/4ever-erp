import type { Schema } from '@/lib/api/contract';
export type Page = Schema<'Page'>;

export interface PageRequest {
  page?: number;
  size?: number;
}
