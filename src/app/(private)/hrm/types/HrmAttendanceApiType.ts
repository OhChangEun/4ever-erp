import type { Schema } from '@/lib/api/contract';
import { type PageRequest } from '@/app/types/Page';

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

/** 날짜별 근태 집계(시각화 5) */
export type AttendanceDailySummary = Schema<'AttendanceDailySummary'>;
export type AttendanceDay = AttendanceDailySummary['days'][number];
