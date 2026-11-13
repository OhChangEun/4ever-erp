import { API_BASE_URL } from '@/app/types/api';

export const HRM_BASE_PATH = `${API_BASE_URL}/business/hrm`;

export const HRM_ENDPOINTS = {
  // 드롭다운
  DEPARTMENTS_DROPDOWN: `${HRM_BASE_PATH}/departments/all`, // 부서 드롭다운
  POSITIONS_DROPDOWN: (departmentId: string) => `${HRM_BASE_PATH}/${departmentId}/positions/all`, // 부서에 따른 직급 드롭다운
  ATTENDANCE_STATUS_DROPDOWN: `${HRM_BASE_PATH}/attendance/statuses`, // 출결 상태 드롭다운
  DEPT_MEMBER_DROPDOWN: (departmentId: string) =>
    `${HRM_BASE_PATH}/departments/${departmentId}/members`, // 부서 구성원 목록 드롭다운
  PAYROLL_STATUS_DROPDOWN: `${HRM_BASE_PATH}/payroll/statuses`, // 급여 상태 드롭다운
  TRAINING_CATE_DROPDOWN: `${HRM_BASE_PATH}/trainings/categories`, //교육 카테고리 드롭다운
  PROGRAM_LIST_DROPDOWN: `${HRM_BASE_PATH}/trainings/programs`, // 교육 프로그램 드롭다운
  PROGRAM_COMPLETION_DROPDOWN: `${HRM_BASE_PATH}/trainings/completion-statuses`, // 교육완료 상태 드롭다운

  // 근태
  ATTENDANCE_DAILY_SUMMARY: `${HRM_BASE_PATH}/attendance/daily-summary`, // 날짜별 근태 집계(시각화 5, verified=false)

  // 부서
  DEPARTMENTS: `${HRM_BASE_PATH}/departments`, // 부서 목록 조회
  DEPARTMENTS_DETAIL: (departmentId: string) => `${HRM_BASE_PATH}/departments/${departmentId}`, // 부서 수정

  // 직원
  EMPLOYEE: `${HRM_BASE_PATH}/employee`, // 직원 목록 조회
  EMPLOYEE_DETAIL: (employeeId: string) => `${HRM_BASE_PATH}/employee/${employeeId}`, // 직원 상세 조회, 수정

  // 직원 가입
  EMPLOYEE_SIGNUP: `${HRM_BASE_PATH}/employee/signup`, // 신규 직원 등록

  // 휴가
  LEAVE_REQUESTS: `${HRM_BASE_PATH}/leave-request`, // 휴가 신청 목록 조회
  LEAVE_REQUEST_REJECT: (requestId: string) => `${HRM_BASE_PATH}/leave/request/${requestId}/reject`, // 휴가 신청 반려
  LEAVE_REQUEST_RELEASE: (requestId: string) =>
    `${HRM_BASE_PATH}/leave/request/${requestId}/release`, // 휴가 신청 승인

  // 급여
  PAYROLL: `${HRM_BASE_PATH}/payroll`, // 급여 목록 조회
  PAYROLL_DETAIL: (payrollId: string) => `${HRM_BASE_PATH}/payroll/${payrollId}`, // 급여 상세 조회
  PAYROLL_COMPLETE: `${HRM_BASE_PATH}/payroll/complete`, // 급여 지급 완료 처리

  // 직책. 화면은 안 부르고 목(src/mocks/handlers/hrm.handlers.ts)만 쓴다
  POSITIONS: `${HRM_BASE_PATH}/positions`, // 직책 목록 조회

  // 교육
  PROGRAM: `${HRM_BASE_PATH}/program`, // 교육 프로그램 목록 조회, 추가
  PROGRAM_DETAIL: (programId: string) => `${HRM_BASE_PATH}/program/${programId}`, // 교육 프로그램 상세 조회, 수정

  TRAINING_STATUS: `${HRM_BASE_PATH}/training-status`, // 직원 교육 현황 조회
  TRAINING_EMPLOYEE_DETAIL: (employeeId: string) =>
    `${HRM_BASE_PATH}/training/employee/${employeeId}`, // 직원 교육 현황 상세 조회

  // 통계
  STATISTICS: `${HRM_BASE_PATH}/statistics`, // HRM 통계 조회

  // 근무 기록
  TIME_RECORD: `${HRM_BASE_PATH}/time-record`, // 출퇴근 기록 목록 조회
  TIME_RECORD_UPDATE: (timeRecordId: string) => `${HRM_BASE_PATH}/time-record/${timeRecordId}`, // 출퇴근 기록 수정 (PUT)
};
