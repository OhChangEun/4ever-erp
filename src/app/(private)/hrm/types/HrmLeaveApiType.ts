import type { Schema } from '@/lib/api/contract';
import { type PageRequest } from '@/app/types/Page';

export type LeaveListData = Schema<'LeaveListData'>;

export type EmployeeSummary = Schema<'HrmEmployeeSummary2'>;

export type LeaveListResponse = Schema<'LeaveListResponse'>;

export interface LeaveRequestParams extends PageRequest {
  department?: string;
  name?: string;
  type?: string;
}
