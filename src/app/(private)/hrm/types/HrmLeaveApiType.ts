import type { Schema } from '@/lib/api/contract';
import { type PageRequest } from '@/app/types/Page';

export type LeaveListResponse = Schema<'LeaveListResponse'>;

export interface LeaveRequestParams extends PageRequest {
  department?: string;
  name?: string;
  type?: string;
}
