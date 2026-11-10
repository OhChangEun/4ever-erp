import { describe, expect, it } from 'vitest';
import { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/render';
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
import {
  HRM_MUTATION_EFFECTS,
  useApproveLeave,
  useAssignProgramToEmployee,
  useCompletePayroll,
  useCreateProgram,
  useRegisterEmployee,
  useRejectLeave,
  useUpdateDepartment,
  useUpdateEmployee,
  useUpdateProgram,
  useUpdateTimeRecord,
} from './hrm.mutations';

const PURCHASE_ORDER_LIST: QueryKey = ['purchase', 'orders', 'list'];
const LEAVE_LIST = leaveKeys.list({ page: 0, size: 10 });
const ATTENDANCE_LIST = attendanceKeys.list({ page: 0, size: 10, date: '2026-11-09' });
const ATTENDANCE_SUMMARY = attendanceKeys.summary();
const PROGRAM_LIST = programKeys.list({ page: 0, size: 10 });
const PROGRAM_DETAIL = programKeys.detail('prog-1');
const PROGRAM_DROPDOWN = programKeys.dropdown();
const DEPARTMENT_LIST = departmentKeys.lists();
const MEMBER_DROPDOWN = departmentKeys.memberDropdown('dept-1');
const TRAINING_LIST = trainingKeys.list({ page: 0, size: 10 });
const TRAINING_DETAIL = trainingKeys.detail('emp-1');
const EMPLOYEE_LIST = employeeKeys.list({ page: 0, size: 10 });
const STATS = hrmStatsKeys.all;
const PAYROLL_LIST = payrollKeys.list({ page: 0, size: 10, year: 2026, month: 11 });
const PAYROLL_DETAIL = payrollKeys.detail('pay-1');
const ALL_KEYS = [
  LEAVE_LIST,
  ATTENDANCE_LIST,
  ATTENDANCE_SUMMARY,
  PROGRAM_LIST,
  PROGRAM_DETAIL,
  PROGRAM_DROPDOWN,
  DEPARTMENT_LIST,
  MEMBER_DROPDOWN,
  TRAINING_LIST,
  TRAINING_DETAIL,
  EMPLOYEE_LIST,
  STATS,
  PAYROLL_LIST,
  PAYROLL_DETAIL,
  PURCHASE_ORDER_LIST,
];

const seed = (qc: QueryClient) => {
  for (const key of ALL_KEYS) qc.setQueryData(key, { seeded: true });
};
const isInvalidated = (qc: QueryClient, key: QueryKey) =>
  qc.getQueryState(key)?.isInvalidated === true;
const wrapperFor = (qc: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return Wrapper;
};
const runHook = async <TVars,>(
  qc: QueryClient,
  useHook: () => { mutateAsync: (vars: TVars) => Promise<unknown> },
  vars: TVars,
) => {
  const { result } = renderHook(useHook, { wrapper: wrapperFor(qc) });
  await result.current.mutateAsync(vars);
};

const employeeBody = {
  name: '김신입',
  departmentId: 'dept-1',
  positionId: 'pos-1',
  email: 'new@everp.local',
  phoneNumber: '010-0000-0000',
  hireDate: '2026-11-01',
  birthDate: '2000-01-01',
  baseAddress: '서울',
  detailAddress: '',
};
const programBody = {
  programName: '안전 교육',
  category: 'SAFETY',
  trainingHour: 4,
  isOnline: true,
  startDate: '2026-12-01',
  capacity: 20,
  requiredDepartments: [],
  requiredPositions: [],
  description: '',
};

interface Case {
  name: string;
  run: (qc: QueryClient) => Promise<unknown>;
  invalidates: QueryKey[];
  keeps: QueryKey[];
}

const cases: Case[] = [
  {
    name: '휴가 승인 → 휴가 목록 + 근태 목록',
    run: (qc) => runHook(qc, useApproveLeave, 'leave-1'),
    invalidates: [LEAVE_LIST, ATTENDANCE_LIST, ATTENDANCE_SUMMARY],
    keeps: [EMPLOYEE_LIST, PAYROLL_LIST, PURCHASE_ORDER_LIST],
  },
  {
    name: '휴가 반려 → 휴가 목록 + 근태 목록',
    run: (qc) => runHook(qc, useRejectLeave, 'leave-1'),
    invalidates: [LEAVE_LIST, ATTENDANCE_LIST, ATTENDANCE_SUMMARY],
    keeps: [EMPLOYEE_LIST, PURCHASE_ORDER_LIST],
  },
  {
    name: '교육 수정 → 목록, 상세, 드롭다운',
    run: (qc) =>
      runHook(qc, useUpdateProgram, {
        programId: 'prog-1',
        programName: '새 이름',
        statusCode: 'OPEN',
      }),
    invalidates: [PROGRAM_LIST, PROGRAM_DETAIL, PROGRAM_DROPDOWN],
    keeps: [TRAINING_LIST, PURCHASE_ORDER_LIST],
  },
  {
    name: '교육 추가 → 목록, 드롭다운',
    run: (qc) => runHook(qc, useCreateProgram, programBody),
    invalidates: [PROGRAM_LIST, PROGRAM_DROPDOWN],
    keeps: [PROGRAM_DETAIL, TRAINING_LIST, PURCHASE_ORDER_LIST],
  },
  {
    name: '부서 수정 → 부서 목록',
    run: (qc) =>
      runHook(qc, useUpdateDepartment, {
        departmentId: 'dept-1',
        body: { managerId: 'emp-1', description: '' },
      }),
    invalidates: [DEPARTMENT_LIST],
    keeps: [EMPLOYEE_LIST, PURCHASE_ORDER_LIST],
  },
  {
    name: '출결 수정 → 근태 목록',
    run: (qc) =>
      runHook(qc, useUpdateTimeRecord, {
        timerecordId: 'tr-1',
        checkInTime: '2026-11-09T09:00',
        checkOutTime: '2026-11-09T18:00',
      }),
    invalidates: [ATTENDANCE_LIST, ATTENDANCE_SUMMARY],
    keeps: [LEAVE_LIST, PURCHASE_ORDER_LIST],
  },
  {
    name: '교육 지정 → 교육 이력 목록, 직원 상세',
    run: (qc) =>
      runHook(qc, useAssignProgramToEmployee, { employeeId: 'emp-1', programId: 'prog-1' }),
    invalidates: [TRAINING_LIST, TRAINING_DETAIL],
    keeps: [PROGRAM_LIST, PURCHASE_ORDER_LIST],
  },
  {
    name: '직원 등록 → 직원 목록, 통계, 해당 부서원 드롭다운',
    run: (qc) => runHook(qc, useRegisterEmployee, employeeBody),
    invalidates: [EMPLOYEE_LIST, STATS, MEMBER_DROPDOWN],
    keeps: [PAYROLL_LIST, PURCHASE_ORDER_LIST],
  },
  {
    name: '직원 수정 → 직원 목록, 부서 키 전부(옛 부서를 몰라서)',
    run: (qc) =>
      runHook(qc, useUpdateEmployee, {
        employeeId: 'emp-1',
        body: { employeeName: '김직원', departmentId: 'dept-2', positionId: 'pos-1' },
      }),
    invalidates: [EMPLOYEE_LIST, MEMBER_DROPDOWN, DEPARTMENT_LIST],
    keeps: [STATS, PAYROLL_LIST, PURCHASE_ORDER_LIST],
  },
  {
    name: '급여 완료 → 급여 목록, 상세',
    run: (qc) => runHook(qc, useCompletePayroll, { payrollId: 'pay-1' }),
    invalidates: [PAYROLL_LIST, PAYROLL_DETAIL],
    keeps: [EMPLOYEE_LIST, STATS, PURCHASE_ORDER_LIST],
  },
];

describe('인사 mutation 훅의 무효화 범위는 매트릭스와 같다', () => {
  it.each(cases)('$name', async ({ run, invalidates, keeps }) => {
    const qc = createTestQueryClient();
    seed(qc);
    await run(qc);
    await waitFor(() => {
      for (const key of invalidates) expect(isInvalidated(qc, key), String(key)).toBe(true);
    });
    for (const key of keeps) expect(isInvalidated(qc, key), String(key)).toBe(false);
  });

  it('매트릭스는 훅 10개를 전부 다룬다', () => {
    expect(Object.keys(HRM_MUTATION_EFFECTS)).toHaveLength(10);
  });
});
