import { AttendanceRequestParams } from '@/app/(private)/hrm/types/HrmAttendanceApiType';
import { EmployeeListRequestParams } from '@/app/(private)/hrm/types/HrmEmployeesApiType';
import { LeaveRequestParams } from '@/app/(private)/hrm/types/HrmLeaveApiType';
import { PayrollRequestParams } from '@/app/(private)/hrm/types/HrmPayrollApiType';
import { ProgramRequestParams } from '@/app/(private)/hrm/types/HrmProgramApiType';
import { TrainingRequestParams } from '@/app/(private)/hrm/types/HrmTrainingApiType';

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

  details: () => [...positionKeys.all, 'detail'] as const,

  detail: (positionId: string) => [...positionKeys.details(), positionId] as const,

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

  statusDropdown: () => [...attendanceKeys.all, 'statusDropdown'] as const,
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
