import type { Schema } from '@/lib/api/contract';
import { PageRequest } from '@/app/types/Page';

export type ProgramListData = Schema<'ProgramListData'>;

export type ProgramListResponse = Schema<'ProgramListResponse'>;

export interface ProgramRequestParams extends PageRequest {
  name?: string;
  status?: string;
  category?: string;
}

export type designatedEmployeeSummary = Schema<'designatedEmployeeSummary'>;

export type ProgramDetailResponse = Schema<'ProgramDetailResponse'>;

export type CreateProgramRequest = Schema<'CreateProgramRequest'>;

export interface UpdateProgramRequest {
  programId: string;
  programName: string;
  statusCode: string;
}

export interface UpdateProgramToEmployeeRequest {
  employeeId: string;
  programId: string;
}
