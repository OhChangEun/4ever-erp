import { type AttendanceRequestParams } from '@/app/(private)/hrm/types/HrmAttendanceApiType';
import { type EmployeeListRequestParams } from '@/app/(private)/hrm/types/HrmEmployeesApiType';
import { type LeaveRequestParams } from '@/app/(private)/hrm/types/HrmLeaveApiType';
import { type PayrollRequestParams } from '@/app/(private)/hrm/types/HrmPayrollApiType';
import { type ProgramRequestParams } from '@/app/(private)/hrm/types/HrmProgramApiType';
import { type TrainingRequestParams } from '@/app/(private)/hrm/types/HrmTrainingApiType';

export const hrmStatsKeys = {
  all: ['hrm', 'stats'] as const,
};

export const employeeKeys = {
  all: ['hrm', 'employees'] as const,

  lists: () => [...employeeKeys.all, 'list'] as const,

  list: (params: EmployeeListRequestParams) => [...employeeKeys.lists(), params] as const,
};

export const departmentKeys = {
  all: ['hrm', 'departments'] as const,

  lists: () => [...departmentKeys.all, 'list'] as const,

  memberDropdown: (departmentId: string) =>
    [...departmentKeys.all, 'memberDropdown', departmentId] as const,
};

export const positionKeys = {
  all: ['hrm', 'positions'] as const,

  dropdown: (departmentId: string) => [...positionKeys.all, 'dropdown', departmentId] as const,
};

export const payrollKeys = {
  all: ['hrm', 'payroll'] as const,

  lists: () => [...payrollKeys.all, 'list'] as const,

  list: (params: PayrollRequestParams) => [...payrollKeys.lists(), params] as const,

  details: () => [...payrollKeys.all, 'detail'] as const,

  detail: (payrollId: string) => [...payrollKeys.details(), payrollId] as const,
};

export const attendanceKeys = {
  all: ['hrm', 'attendance'] as const,

  lists: () => [...attendanceKeys.all, 'list'] as const,

  list: (params: AttendanceRequestParams) => [...attendanceKeys.lists(), params] as const,

  // 근태 잔디(시각화 5). 목록을 무효화하는 mutation 이 이것도 같이 지운다
  summary: () => [...attendanceKeys.all, 'summary'] as const,
};

export const leaveKeys = {
  all: ['hrm', 'leave'] as const,

  lists: () => [...leaveKeys.all, 'list'] as const,

  list: (params: LeaveRequestParams) => [...leaveKeys.lists(), params] as const,
};

export const trainingKeys = {
  all: ['hrm', 'training'] as const,

  lists: () => [...trainingKeys.all, 'list'] as const,

  list: (params: TrainingRequestParams) => [...trainingKeys.lists(), params] as const,

  details: () => [...trainingKeys.all, 'detail'] as const,

  detail: (employeeId: string) => [...trainingKeys.details(), employeeId] as const,
};

export const programKeys = {
  all: ['hrm', 'programs'] as const,

  lists: () => [...programKeys.all, 'list'] as const,

  list: (params: ProgramRequestParams) => [...programKeys.lists(), params] as const,

  details: () => [...programKeys.all, 'detail'] as const,

  detail: (programId: string) => [...programKeys.details(), programId] as const,

  dropdown: () => [...programKeys.all, 'dropdown'] as const,

  statusDropdown: () => [...programKeys.all, 'statusDropdown'] as const,

  categoryDropdown: () => [...programKeys.all, 'categoryDropdown'] as const,
};
