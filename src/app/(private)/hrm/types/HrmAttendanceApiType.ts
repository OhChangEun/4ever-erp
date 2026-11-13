import type { Schema } from '@/lib/api/contract';
import { type PageRequest } from '@/app/types/Page';

export type AttendanceListResponse = Schema<'AttendanceListResponse'>;

export interface AttendanceRequestParams extends PageRequest {
  date: string;
  department?: string;
  /** 출결 상태 코드(서버 statusCode, 예: LATE) */
  statusCode?: string;
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
