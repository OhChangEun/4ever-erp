import type { Schema } from '@/lib/api/contract';
import { PageRequest } from '@/app/types/Page';

export type EmployeeData = Schema<'EmployeeData'>;

export type EmployeeListResponse = Schema<'EmployeeListResponse'>;

// 응답 요청시 request params
export interface EmployeeListRequestParams extends PageRequest {
  departmentId?: string;
  name?: string;
}

export type EmployeeRegisterRequest = Schema<'EmployeeRegisterRequest'>;

export type EmployeeUpdateRequest = Schema<'EmployeeUpdateRequest'>;
