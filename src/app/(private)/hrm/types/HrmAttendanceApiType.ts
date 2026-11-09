import type { Schema } from '@/lib/api/contract';
import { PageRequest } from '@/app/types/Page';

export type EmployeeInfo = Schema<'EmployeeInfo'>;

export type AttendanceListData = Schema<'AttendanceListData'>;

export type AttendanceListResponse = Schema<'AttendanceListResponse'>;

export interface AttendanceRequestParams extends PageRequest {
  date: string;
  department?: string;
  name?: string;
}

export interface UpdateTimeRecord {
  timerecordId: string;
  checkInTime: string;
  checkOutTime: string;
}
