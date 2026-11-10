import type { Schema } from '@/lib/api/contract';
import { type PageRequest } from '@/app/types/Page';

export interface PayrollRequestParams extends PageRequest {
  year: number;
  month: number;
  name?: string;
  department?: string;
  statusCode?: string;
}

export type EmployeeSummary = Schema<'HrmEmployeeSummary'>;

export type PaySummary = Schema<'PaySummary'>;

export type PayRollList = Schema<'PayRollList'>;

export type PayRollListResponse = Schema<'PayRollListResponse'>;

export type PayItemData = Schema<'PayItemData'>;

export type PayRollDetailResponse = Schema<'PayRollDetailResponse'>;

export type PayRollCompleteRequestParams = Schema<'PayRollCompleteRequestParams'>;
