import type { AttendanceDailySummary } from '@/app/(private)/hrm/types/HrmAttendanceApiType';
import type { OptionResponse } from '@/app/types/api';
import { ApiResponse, ApiResponseNoData } from '@/app/types/api';
import { HRM_ENDPOINTS } from '@/app/(private)/hrm/api/hrm.endpoints';
import axios from '@/lib/axiosInstance';
import { HrmStatResponse } from '@/app/(private)/hrm/types/HrmStatsApiType';
import {
  EmployeeListRequestParams,
  EmployeeListResponse,
  EmployeeRegisterRequest,
  EmployeeUpdateRequest,
} from '@/app/(private)/hrm/types/HrmEmployeesApiType';
import {
  PositionDataResponse,
  PositionDetailResponse,
} from '@/app/(private)/hrm/types/HrmPositionsApiType';
import {
  DepartmentsListResponse,
  DepartmentsRequestBody,
} from '@/app/(private)/hrm/types/HrmDepartmentsApiType';
import {
  PayrollRequestParams,
  PayRollDetailResponse,
  PayRollListResponse,
  PayRollCompleteRequestParams,
} from '@/app/(private)/hrm/types/HrmPayrollApiType';
import {
  TrainingDetailResponse,
  TrainingListResponse,
  TrainingRequestParams,
} from '@/app/(private)/hrm/types/HrmTrainingApiType';
import {
  CreateProgramRequest,
  ProgramDetailResponse,
  ProgramListResponse,
  ProgramRequestParams,
  UpdateProgramRequest,
  UpdateProgramToEmployeeRequest,
} from '@/app/(private)/hrm/types/HrmProgramApiType';
import {
  AttendanceListResponse,
  AttendanceRequestParams,
  UpdateTimeRecord,
} from '@/app/(private)/hrm/types/HrmAttendanceApiType';
import { LeaveListResponse, LeaveRequestParams } from '@/app/(private)/hrm/types/HrmLeaveApiType';

// 인적자원관리 지표 조회
export const fetchHrmStats = async (): Promise<HrmStatResponse> => {
  const res = await axios.get<ApiResponse<HrmStatResponse>>(`${HRM_ENDPOINTS.STATISTICS}`);
  return res.data.data;
};

// 직원 목록 조회
export const fetchEmployeesList = async (
  params: EmployeeListRequestParams,
): Promise<EmployeeListResponse> => {
  const res = await axios.get<ApiResponse<EmployeeListResponse>>(`${HRM_ENDPOINTS.EMPLOYEE}`, {
    params,
  });
  return res.data.data;
};

// 직급 목록 조회
export const fetchPositionsList = async (): Promise<PositionDataResponse> => {
  const res = await axios.get<ApiResponse<PositionDataResponse>>(`${HRM_ENDPOINTS.POSITIONS}`);
  return res.data.data;
};

// 직급 상세 조회
export const fetchPositionsDetail = async (positionId: string): Promise<PositionDetailResponse> => {
  const res = await axios.get<ApiResponse<PositionDetailResponse>>(
    `${HRM_ENDPOINTS.POSITION_DETAIL(positionId)}`,
  );
  return res.data.data;
};

// 부서 목록 조회
export const fetchDepartmentsList = async (): Promise<DepartmentsListResponse> => {
  const res = await axios.get<ApiResponse<DepartmentsListResponse>>(`${HRM_ENDPOINTS.DEPARTMENTS}`);
  return res.data.data;
};

// 부서 수정
export const patchDepartments = async (departmentId: string, body: DepartmentsRequestBody) => {
  const res = await axios.patch<ApiResponse<null>>(
    `${HRM_ENDPOINTS.DEPARTMENTS_DETAIL(departmentId)}`,
    body,
  );
  return res.data;
};

// 월별 급여 목록 조회
export const fetchPayRollList = async (
  params: PayrollRequestParams,
): Promise<PayRollListResponse> => {
  const res = await axios.get<ApiResponse<PayRollListResponse>>(`${HRM_ENDPOINTS.PAYROLL}`, {
    params,
  });
  return res.data.data;
};

// 월별 급여 상세 조회
export const fetchPayRollDetail = async (payrollId: string): Promise<PayRollDetailResponse> => {
  const res = await axios.get<ApiResponse<PayRollDetailResponse>>(
    `${HRM_ENDPOINTS.PAYROLL_DETAIL(payrollId)}`,
  );
  return res.data.data;
};

// 직원 교육 목록 조회
export const fetchTrainingList = async (
  params: TrainingRequestParams,
): Promise<TrainingListResponse> => {
  const res = await axios.get<ApiResponse<TrainingListResponse>>(
    `${HRM_ENDPOINTS.TRAINING_STATUS}`,
    { params },
  );
  return res.data.data;
};

// 직원 교육 상세 조회
export const fetchTrainingDetail = async (employeeId: string): Promise<TrainingDetailResponse> => {
  const res = await axios.get<ApiResponse<TrainingDetailResponse>>(
    `${HRM_ENDPOINTS.TRAINING_EMPLOYEE_DETAIL(employeeId)}`,
  );
  return res.data.data;
};

// 교육 프로그램 목록 조회
export const fetchProgramList = async (
  params: ProgramRequestParams,
): Promise<ProgramListResponse> => {
  const res = await axios.get<ApiResponse<ProgramListResponse>>(`${HRM_ENDPOINTS.PROGRAM}`, {
    params,
  });
  return res.data.data;
};

// 교육 프로그램 상세 조회
export const fetchProgramDetail = async (programId: string): Promise<ProgramDetailResponse> => {
  const res = await axios.get<ApiResponse<ProgramDetailResponse>>(
    `${HRM_ENDPOINTS.PROGRAM_DETAIL(programId)}`,
  );
  return res.data.data;
};

// 출퇴근기록 목록 조회
export const fetchAttendanceList = async (
  params: AttendanceRequestParams,
): Promise<AttendanceListResponse> => {
  const res = await axios.get<ApiResponse<AttendanceListResponse>>(`${HRM_ENDPOINTS.TIME_RECORD}`, {
    params,
  });
  return res.data.data;
};

// 휴가 목록 조회
export const fetchLeaveList = async (params: LeaveRequestParams): Promise<LeaveListResponse> => {
  const res = await axios.get<ApiResponse<LeaveListResponse>>(`${HRM_ENDPOINTS.LEAVE_REQUESTS}`, {
    params,
  });
  return res.data.data;
};

// 신규 직원 등록
// 추후 생성

// 직원 정보 수정
export const putEmployee = async (
  employeeId: string,
  data: EmployeeUpdateRequest,
): Promise<ApiResponseNoData> => {
  const res = await axios.patch<ApiResponseNoData>(
    `${HRM_ENDPOINTS.EMPLOYEE_DETAIL(employeeId)}`,
    data,
  );
  return res.data;
};

// 휴가 신청 승인
export const postLeaveRelease = async (requestId: string) => {
  const res = await axios.patch<ApiResponse<null>>(
    `${HRM_ENDPOINTS.LEAVE_REQUEST_RELEASE(requestId)}`,
  );
  return res.data;
};

// 휴가 신청 반려
export const postLeaveReject = async (requestId: string) => {
  const res = await axios.patch<ApiResponse<null>>(
    `${HRM_ENDPOINTS.LEAVE_REQUEST_REJECT(requestId)}`,
  );
  return res.data;
};

// 교육 프로그램 추가
export const postProgram = async (data: CreateProgramRequest) => {
  const res = await axios.post<ApiResponse<null>>(`${HRM_ENDPOINTS.PROGRAM}`, data);
  return res.data;
};

// 교육 프로그램 수정
export const patchProgram = async (params: UpdateProgramRequest) => {
  const { programId, programName, statusCode } = params;
  const res = await axios.patch<ApiResponse<null>>(`${HRM_ENDPOINTS.PROGRAM_DETAIL(programId)}`, {
    programName,
    statusCode,
  });
  return res.data;
};

// 교육 대상자에게 교육 프로그램 지정
export const postProgramToEmployee = async (params: UpdateProgramToEmployeeRequest) => {
  const { employeeId, programId } = params;
  const res = await axios.post<ApiResponse<null>>(`${HRM_ENDPOINTS.PROGRAM_DETAIL(employeeId)}`, {
    programId,
  });
  return res.data;
};

// 출퇴근 기록 수정
export const putTimeRecord = async (params: UpdateTimeRecord) => {
  const { timerecordId, checkInTime, checkOutTime } = params;
  const res = await axios.put<ApiResponse<null>>(
    `${HRM_ENDPOINTS.TIME_RECORD_UPDATE(timerecordId)}`,
    {
      checkInTime,
      checkOutTime,
    },
  );
  return res.data;
};

// 급여 지급 완료 처리
export const postPayrollComplete = async (params: PayRollCompleteRequestParams) => {
  const res = await axios.post<ApiResponse<null>>(`${HRM_ENDPOINTS.PAYROLL_COMPLETE}`, params);
  return res.data;
};

// 직원 등록
export const postEmployeeRegister = async (body: EmployeeRegisterRequest) => {
  const res = await axios.post<ApiResponse<null>>(`${HRM_ENDPOINTS.EMPLOYEE_SIGNUP}`, body);
  return res.data;
};

// --- 드롭다운 API ---
// 부서 드롭다운 조회
export const fetchDepartmentsDropdown = async (): Promise<OptionResponse[]> => {
  const res = await axios.get<ApiResponse<OptionResponse[]>>(HRM_ENDPOINTS.DEPARTMENTS_DROPDOWN);
  return res.data.data;
};

// 직급 드롭다운 조회
export const fetchPositionsDropdown = async (departmentId: string): Promise<OptionResponse[]> => {
  const res = await axios.get<ApiResponse<OptionResponse[]>>(
    HRM_ENDPOINTS.POSITIONS_DROPDOWN(departmentId),
  );
  return res.data.data;
};

// 출결 상태 드롭다운 조회
export const fetchAttendanceStatusDropdown = async (): Promise<OptionResponse[]> => {
  const res = await axios.get<ApiResponse<OptionResponse[]>>(
    HRM_ENDPOINTS.ATTENDANCE_STATUS_DROPDOWN,
  );
  return res.data.data;
};

// 부서 구성원 목록 드롭다운 조회
export const fetchDeptMemberDropdown = async (departmentId: string): Promise<OptionResponse[]> => {
  const res = await axios.get<ApiResponse<OptionResponse[]>>(
    HRM_ENDPOINTS.DEPT_MEMBER_DROPDOWN(departmentId),
  );
  return res.data.data;
};

// 급여 상태 드롭다운 조회
export const fetchPayrollStatusDropdown = async (): Promise<OptionResponse[]> => {
  const res = await axios.get<ApiResponse<OptionResponse[]>>(HRM_ENDPOINTS.PAYROLL_STATUS_DROPDOWN);
  return res.data.data;
};

// 교육 카테고리 드롭다운 조회
export const fetchTrainingCategoryDropdown = async (): Promise<OptionResponse[]> => {
  const res = await axios.get<ApiResponse<OptionResponse[]>>(HRM_ENDPOINTS.TRAINING_CATE_DROPDOWN);
  return res.data.data;
};

// 교육 프로그램 드롭다운 조회
export const fetchProgramListDropdown = async (): Promise<OptionResponse[]> => {
  const res = await axios.get<ApiResponse<OptionResponse[]>>(HRM_ENDPOINTS.PROGRAM_LIST_DROPDOWN);
  return res.data.data;
};

// 교육 프로그램 상태 조회
export const fetchProgramStatusDropdown = async (): Promise<OptionResponse[]> => {
  const res = await axios.get<ApiResponse<OptionResponse[]>>(
    HRM_ENDPOINTS.PROGRAM_COMPLETION_DROPDOWN,
  );
  return res.data.data;
};

// 날짜별 근태 집계(최근 12주, 시각화 5)
export const fetchAttendanceDailySummary = async (): Promise<AttendanceDailySummary> => {
  const res = await axios.get<ApiResponse<AttendanceDailySummary>>(
    HRM_ENDPOINTS.ATTENDANCE_DAILY_SUMMARY,
  );
  return res.data.data;
};
