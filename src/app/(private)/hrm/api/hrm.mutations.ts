import type { QueryKey } from '@tanstack/react-query';
import {
  useInvalidatingMutation,
  type MutationCallbacks,
} from '@/lib/query/useInvalidatingMutation';
import {
  patchDepartments,
  patchProgram,
  postEmployeeRegister,
  postLeaveReject,
  postLeaveRelease,
  postPayrollComplete,
  postProgram,
  postProgramToEmployee,
  putEmployee,
  putTimeRecord,
} from './hrm.api';
import {
  attendanceKeys,
  departmentKeys,
  employeeKeys,
  hrmStatsKeys,
  leaveKeys,
  payrollKeys,
  programKeys,
  trainingKeys,
} from './hrm.keys';
import type { DepartmentsRequestBody } from '@/app/(private)/hrm/types/HrmDepartmentsApiType';
import type {
  EmployeeRegisterRequest,
  EmployeeUpdateRequest,
} from '@/app/(private)/hrm/types/HrmEmployeesApiType';
import type {
  CreateProgramRequest,
  UpdateProgramRequest,
  UpdateProgramToEmployeeRequest,
} from '@/app/(private)/hrm/types/HrmProgramApiType';
import type { UpdateTimeRecord } from '@/app/(private)/hrm/types/HrmAttendanceApiType';
import type { PayRollCompleteRequestParams } from '@/app/(private)/hrm/types/HrmPayrollApiType';
import type { ApiResponse, ApiResponseNoData } from '@/app/types/api';

/**
 * 인사 도메인 mutation → 다시 가져올 쿼리 키. 이 표가 동작이다(훅이 이 표를 읽는다).
 * ARCHITECTURE.md 5절의 인사 표는 이걸 옮겨 적은 것. 다른 도메인 키는 넣지 않는다.
 * 드롭다운 쿼리는 staleTime Infinity 라 마스터(교육, 부서원)를 바꾸는 mutation 이 반드시 지운다.
 */
export const HRM_MUTATION_EFFECTS = {
  // 휴가는 근태에 반영된다(서버 계약 미확인, 다시 가져오는 비용이 틀린 화면보다 싸다)
  approveLeave: (): readonly QueryKey[] => [leaveKeys.lists(), attendanceKeys.lists()],
  rejectLeave: (): readonly QueryKey[] => [leaveKeys.lists(), attendanceKeys.lists()],
  updateProgram: (programId: string): readonly QueryKey[] => [
    programKeys.lists(),
    programKeys.detail(programId),
    programKeys.dropdown(),
  ],
  createProgram: (): readonly QueryKey[] => [programKeys.lists(), programKeys.dropdown()],
  updateDepartment: (): readonly QueryKey[] => [departmentKeys.lists()],
  updateTimeRecord: (): readonly QueryKey[] => [attendanceKeys.lists()],
  assignProgram: (employeeId: string): readonly QueryKey[] => [
    trainingKeys.lists(),
    trainingKeys.detail(employeeId),
  ],
  registerEmployee: (departmentId: string): readonly QueryKey[] => [
    employeeKeys.lists(),
    hrmStatsKeys.all,
    departmentKeys.memberDropdown(departmentId),
  ],
  // 옛 부서와 새 부서의 부서원 드롭다운을 둘 다 비워야 하는데 옛 부서 id 를 모른다. 부서 키 전부.
  updateEmployee: (): readonly QueryKey[] => [employeeKeys.lists(), departmentKeys.all],
  completePayroll: (payrollId: string): readonly QueryKey[] => [
    payrollKeys.lists(),
    payrollKeys.detail(payrollId),
  ],
} as const;

export type HrmMutationName = keyof typeof HRM_MUTATION_EFFECTS;

export const hrmMutationKey = (name: HrmMutationName) => ['hrm', 'mutation', name] as const;

function useHrmMutation<TData, TVariables>(
  name: HrmMutationName,
  mutationFn: (variables: TVariables) => Promise<TData>,
  effects: (variables: TVariables) => readonly QueryKey[],
  callbacks?: MutationCallbacks<TData, TVariables>,
) {
  return useInvalidatingMutation<TData, TVariables>({
    mutationKey: hrmMutationKey(name),
    mutationFn,
    effects,
    callbacks,
  });
}

type NoData = ApiResponse<null>;

export const useApproveLeave = (callbacks?: MutationCallbacks<NoData, string>) =>
  useHrmMutation(
    'approveLeave',
    (requestId: string) => postLeaveRelease(requestId),
    () => HRM_MUTATION_EFFECTS.approveLeave(),
    callbacks,
  );

export const useRejectLeave = (callbacks?: MutationCallbacks<NoData, string>) =>
  useHrmMutation(
    'rejectLeave',
    (requestId: string) => postLeaveReject(requestId),
    () => HRM_MUTATION_EFFECTS.rejectLeave(),
    callbacks,
  );

export const useUpdateProgram = (callbacks?: MutationCallbacks<NoData, UpdateProgramRequest>) =>
  useHrmMutation(
    'updateProgram',
    (params: UpdateProgramRequest) => patchProgram(params),
    ({ programId }) => HRM_MUTATION_EFFECTS.updateProgram(programId),
    callbacks,
  );

export const useCreateProgram = (callbacks?: MutationCallbacks<NoData, CreateProgramRequest>) =>
  useHrmMutation(
    'createProgram',
    (body: CreateProgramRequest) => postProgram(body),
    () => HRM_MUTATION_EFFECTS.createProgram(),
    callbacks,
  );

export interface UpdateDepartmentVariables {
  departmentId: string;
  body: DepartmentsRequestBody;
}
export const useUpdateDepartment = (
  callbacks?: MutationCallbacks<NoData, UpdateDepartmentVariables>,
) =>
  useHrmMutation(
    'updateDepartment',
    ({ departmentId, body }: UpdateDepartmentVariables) => patchDepartments(departmentId, body),
    () => HRM_MUTATION_EFFECTS.updateDepartment(),
    callbacks,
  );

export const useUpdateTimeRecord = (callbacks?: MutationCallbacks<NoData, UpdateTimeRecord>) =>
  useHrmMutation(
    'updateTimeRecord',
    (params: UpdateTimeRecord) => putTimeRecord(params),
    () => HRM_MUTATION_EFFECTS.updateTimeRecord(),
    callbacks,
  );

export const useAssignProgramToEmployee = (
  callbacks?: MutationCallbacks<NoData, UpdateProgramToEmployeeRequest>,
) =>
  useHrmMutation(
    'assignProgram',
    (params: UpdateProgramToEmployeeRequest) => postProgramToEmployee(params),
    ({ employeeId }) => HRM_MUTATION_EFFECTS.assignProgram(employeeId),
    callbacks,
  );

export const useRegisterEmployee = (
  callbacks?: MutationCallbacks<NoData, EmployeeRegisterRequest>,
) =>
  useHrmMutation(
    'registerEmployee',
    (body: EmployeeRegisterRequest) => postEmployeeRegister(body),
    ({ departmentId }) => HRM_MUTATION_EFFECTS.registerEmployee(departmentId),
    callbacks,
  );

export interface UpdateEmployeeVariables {
  employeeId: string;
  body: EmployeeUpdateRequest;
}
export const useUpdateEmployee = (
  callbacks?: MutationCallbacks<ApiResponseNoData, UpdateEmployeeVariables>,
) =>
  useHrmMutation(
    'updateEmployee',
    ({ employeeId, body }: UpdateEmployeeVariables) => putEmployee(employeeId, body),
    () => HRM_MUTATION_EFFECTS.updateEmployee(),
    callbacks,
  );

export const useCompletePayroll = (
  callbacks?: MutationCallbacks<NoData, PayRollCompleteRequestParams>,
) =>
  useHrmMutation(
    'completePayroll',
    (params: PayRollCompleteRequestParams) => postPayrollComplete(params),
    ({ payrollId }) => HRM_MUTATION_EFFECTS.completePayroll(payrollId),
    callbacks,
  );
