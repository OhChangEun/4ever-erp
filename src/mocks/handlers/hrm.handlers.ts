import { http, type PathParams } from 'msw';
import { HRM_BASE_PATH, HRM_ENDPOINTS } from '@/app/(private)/hrm/api/hrm.endpoints';
import type { Schema } from '@/lib/api/contract';
import { addCreated, mockState } from '../state';
import { HEADCOUNT } from './attendanceSummary.handlers';
import {
  ok,
  okNoData,
  error,
  notFound,
  shouldError,
  isoNow,
  makePage,
  level,
  statResponse,
} from './utils';

type Employee = Schema<'EmployeeData'>;
type Program = Schema<'ProgramListData'>;
type ProgramEdit = { programName: string; statusCode: string };
type TimeRecordEdit = { checkInTime: string; checkOutTime: string };

/**
 * 인사 목이 기억하는 쓰기 결과(로그인별, `src/mocks/state.ts`).
 * 상태 값은 verified=false 다. 타입이 있는 응답 필드 근거가 없다.
 * 급여 PAYROLL_UNPAID, PAYROLL_PAID: 목록 요청의 파라미터 설명(HrmController.java:349)과 enum PayrollStatus.
 *   그 enum 은 선언만 있고 참조하는 곳이 없다. 응답 DTO `PayrollListPayDto.statusCode` 는 String 이다.
 * 휴가 APPROVED, REJECTED: enum LeaveRequestStatus(참조하는 곳 없음). 게이트웨이 목록 DTO `LeaveRequestListItemDto` 에는
 *   상태 필드가 아예 없다(HrmController.java:572). 화면은 `leave.status` 로 버튼을 그린다(카드 별도 보고).
 * 이미 처리된 건에 또 보내도 성공으로 답한다(실서버 동작 미확인)
 */
const hrmState = mockState<{
  paidPayrolls: Set<string>;
  leaveStatus: Map<string, string>;
  departmentEdits: Map<string, Schema<'DepartmentsRequestBody'>>;
  employeeEdits: Map<string, Schema<'EmployeeUpdateRequest'>>;
  createdEmployees: Employee[];
  programEdits: Map<string, ProgramEdit>;
  createdPrograms: Program[];
  /** 직원 id → 지정한 교육 프로그램 id 들 */
  assignedPrograms: Map<string, string[]>;
  timeRecordEdits: Map<string, TimeRecordEdit>;
}>(() => ({
  paidPayrolls: new Set(),
  leaveStatus: new Map(),
  departmentEdits: new Map(),
  employeeEdits: new Map(),
  createdEmployees: [],
  programEdits: new Map(),
  createdPrograms: [],
  assignedPrograms: new Map(),
  timeRecordEdits: new Map(),
}));

const payrollStatus = (request: Request, payrollId: string) =>
  hrmState(request).paidPayrolls.has(payrollId) ? 'PAYROLL_PAID' : 'PAYROLL_UNPAID';

// 드롭다운 목과 직원 수정, 등록이 같은 이름표를 쓴다
const DEPARTMENTS = [
  { key: 'dept-001', value: '영업팀' },
  { key: 'dept-002', value: '구매팀' },
];
const POSITIONS = [
  { key: 'pos-001', value: '팀장' },
  { key: 'pos-002', value: '사원' },
];
const PROGRAMS = [{ key: 'prog-001', value: '안전 교육' }];
/** 모르는 id 는 id 를 그대로 보인다 */
const nameOf = (options: Array<{ key: string; value: string }>, id: string) =>
  options.find((option) => option.key === id)?.value ?? id;

const SEED_EMPLOYEE: Employee = {
  employeeId: 'emp-001',
  employeeNumber: 'EMP-2026-001',
  name: '홍길동',
  email: 'user@everp.co.kr',
  phone: '010-1234-5678',
  position: '팀장',
  department: '영업팀',
  statusCode: 'ACTIVE',
  hireDate: '2022-03-01',
  birthDate: '1990-01-01',
  address: '서울특별시 강남구',
  createdAt: isoNow,
  updatedAt: isoNow,
};

const SEED_PROGRAM: Program = {
  programId: 'prog-001',
  programName: '안전 교육',
  statusCode: 'ACTIVE',
  category: 'SAFETY',
  trainingHour: 4,
  isOnline: true,
  capacity: 30,
};

/**
 * 직원 수는 근태 집계 목의 인원이다(카드 "목 데이터 현실성" 결정 4). 직원 목록이 한 줄이라 목록 수를 쓰면 1명이 된다.
 * 신규 입사자는 직원 목록의 입사일(2022년)로 셀 수 없어 한 달에 2명꼴로 둔다(verified=false)
 */
const mockHrmStats = statResponse({
  totalEmployeeCount: level(HEADCOUNT),
  newEmployeeCount: { week: 0, month: 2, quarter: 5, year: 18 },
});

/** 교육 프로그램 목록. 기본 행과 새 행에 수정한 이름, 상태를 덮는다 */
const programsOf = (request: Request) => {
  const state = hrmState(request);
  return [SEED_PROGRAM, ...state.createdPrograms].map((program) => ({
    ...program,
    ...state.programEdits.get(program.programId),
  }));
};

export const hrmHandlers = [
  http.get(HRM_ENDPOINTS.STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load HRM stats', 500);
    return ok(mockHrmStats);
  }),
  http.get(HRM_ENDPOINTS.EMPLOYEE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load employees', 500);
    const state = hrmState(request);
    const content = [SEED_EMPLOYEE, ...state.createdEmployees].map((employee) => {
      const edit = state.employeeEdits.get(employee.employeeId);
      return edit
        ? {
            ...employee,
            name: edit.employeeName,
            department: nameOf(DEPARTMENTS, edit.departmentId),
            position: nameOf(POSITIONS, edit.positionId),
          }
        : employee;
    });
    return ok({ content, page: makePage(0, 10, content.length) });
  }),
  http.get(HRM_ENDPOINTS.POSITIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load positions', 500);
    return ok([
      {
        positionId: 'pos-001',
        positionName: '팀장',
        headCount: 4,
        payment: 5000000,
      },
    ]);
  }),
  http.get(`${HRM_BASE_PATH}/positions/:positionId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load position detail', 500);
    // 직급 목록은 pos-001 한 행이다(카드 "없는 건은 404")
    if (params.positionId !== 'pos-001') return notFound('직급 상세 조회');
    return ok({
      positionId: params.positionId,
      positionName: '팀장',
      headCount: 4,
      payment: 5000000,
      employees: [
        {
          employeeId: 'emp-001',
          employeeCode: 'EMP-2026-001',
          employeeName: '홍길동',
          positionId: params.positionId,
          position: '팀장',
          departmentId: 'dept-001',
          department: '영업팀',
          hireDate: '2022-03-01',
        },
      ],
    });
  }),
  http.get(HRM_ENDPOINTS.DEPARTMENTS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load departments', 500);
    return ok({
      content: [
        {
          departmentId: 'dept-001',
          departmentNumber: 'D-001',
          departmentName: '영업팀',
          description: 'B2B 영업',
          managerName: '홍길동',
          managerId: 'emp-001',
          location: '서울 강남',
          statusCode: 'ACTIVE',
          // 부서장 이름은 부서원 목이 한 명이라 바꾸지 않고 id 와 설명만 따른다
          ...hrmState(request).departmentEdits.get('dept-001'),
          employeeCount: 8,
          establishedDate: '2020-01-01',
          employees: [
            {
              employeeId: 'emp-001',
              employeeName: '홍길동',
              position: '팀장',
              hireDate: '2022-03-01',
            },
          ],
        },
      ],
    });
  }),
  http.patch<{ departmentId: string }, Schema<'DepartmentsRequestBody'>>(
    `${HRM_BASE_PATH}/departments/:departmentId`,
    async ({ request, params }) => {
      if (shouldError(request)) return error('Failed to update department', 500);
      hrmState(request).departmentEdits.set(params.departmentId, await request.json());
      return ok(null);
    },
  ),
  http.get(HRM_ENDPOINTS.PAYROLL, ({ request }) => {
    if (shouldError(request)) return error('Failed to load payroll list', 500);
    return ok({
      content: [
        {
          payrollId: 'pay-001',
          employee: {
            employeeId: 'emp-001',
            employeeName: '홍길동',
            departmentId: 'dept-001',
            department: '영업팀',
            positionId: 'pos-001',
            position: '팀장',
          },
          pay: {
            basePay: 3000000,
            overtimePay: 200000,
            deduction: 150000,
            netPay: 3050000,
            statusCode: payrollStatus(request, 'pay-001'),
          },
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.get<{ payrollId: string }>(`${HRM_BASE_PATH}/payroll/:payrollId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load payroll detail', 500);
    // 급여 목록은 pay-001 한 행이다
    if (params.payrollId !== 'pay-001') return notFound('급여 명세서 상세 조회');
    return ok({
      payrollId: params.payrollId,
      employee: {
        employeeId: 'emp-001',
        employeeName: '홍길동',
        departmentId: 'dept-001',
        department: '영업팀',
        positionId: 'pos-001',
        position: '팀장',
      },
      pay: {
        basePay: 3000000,
        basePayItem: [{ itemContent: '기본급', itemSum: 3000000 }],
        overtimePay: 200000,
        overtimePayItem: [{ itemContent: '연장근무', itemSum: 200000 }],
        deduction: 150000,
        deductionItem: [{ itemContent: '세금', itemSum: 150000 }],
        netPay: 3050000,
      },
      statusCode: payrollStatus(request, params.payrollId),
      expectedDate: '2026-01-25',
    });
  }),
  http.get(HRM_ENDPOINTS.TRAINING_STATUS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load training list', 500);
    return ok({
      items: [
        {
          employeeId: 'emp-001',
          name: '홍길동',
          department: '영업팀',
          position: '팀장',
          completedCount: 2,
          inProgressCount: 1 + (hrmState(request).assignedPrograms.get('emp-001')?.length ?? 0),
          requiredMissingCount: 0,
          lastTrainingDate: '2026-01-05',
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.get<{ employeeId: string }>(
    `${HRM_BASE_PATH}/training/employee/:employeeId`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to load training detail', 500);
      // 교육 현황 목록은 emp-001 한 행이다
      if (params.employeeId !== 'emp-001') return notFound('직원 교육 이력 조회');
      const assigned = hrmState(request).assignedPrograms.get(params.employeeId) ?? [];
      return ok({
        employeeId: params.employeeId,
        employeeName: '홍길동',
        department: '영업팀',
        position: '팀장',
        completedCount: 2,
        requiredMissingCount: 0,
        lastTrainingDate: '2026-01-05',
        programHistory: [
          {
            programId: 'prog-001',
            programName: '안전 교육',
            programStatus: 'COMPLETED',
            completedAt: '2026-01-05',
          },
          ...assigned.map((programId) => ({
            programId,
            programName: nameOf(PROGRAMS, programId),
            programStatus: 'INCOMPLETED',
            completedAt: '',
          })),
        ],
      });
    },
  ),
  http.get(HRM_ENDPOINTS.PROGRAM, ({ request }) => {
    if (shouldError(request)) return error('Failed to load program list', 500);
    const content = programsOf(request);
    return ok({ content, page: makePage(0, 10, content.length) });
  }),
  http.get<{ programId: string }>(`${HRM_BASE_PATH}/program/:programId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load program detail', 500);
    // 목록의 그 행에서 만든다. 그 로그인의 목록에 없으면 404
    const program = programsOf(request).find((row) => row.programId === params.programId);
    if (!program) return notFound('교육 프로그램 상세 조회');
    return ok({
      programId: params.programId,
      programName: program.programName,
      statusCode: program.statusCode,
      category: program.category,
      trainingHour: program.trainingHour,
      isOnline: program.isOnline,
      startDate: '2026-02-01',
      designatedEmployee: [
        {
          employeeId: 'emp-001',
          employeeName: '홍길동',
          department: '영업팀',
          position: '팀장',
          statusCode: 'PENDING',
          completedAt: null,
        },
      ],
      number: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    });
  }),
  http.get(HRM_ENDPOINTS.TIME_RECORD, ({ request }) => {
    if (shouldError(request)) return error('Failed to load attendance list', 500);
    return ok({
      content: [
        {
          timerecordId: 'time-001',
          employee: {
            employeeId: 'emp-001',
            employeeName: '홍길동',
            departmentId: 'dept-001',
            department: '영업팀',
            positionId: 'pos-001',
            position: '팀장',
          },
          workDate: '2026-01-28',
          checkInTime: '2026-01-28T09:00:00',
          checkOutTime: '2026-01-28T18:00:00',
          // 근무 시간과 지각 여부는 다시 계산하지 않는다(서버 규칙을 모른다)
          ...hrmState(request).timeRecordEdits.get('time-001'),
          totalWorkMinutes: 540,
          overtimeMinutes: 30,
          statusCode: 'ON_TIME',
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.get(HRM_ENDPOINTS.LEAVE_REQUESTS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load leave list', 500);
    return ok({
      content: [
        {
          leaveRequestId: 'leave-001',
          employee: {
            employeeId: 'emp-001',
            employeeName: '홍길동',
            department: '영업팀',
            position: '팀장',
          },
          leaveType: 'ANNUAL',
          startDate: '2026-02-05',
          endDate: '2026-02-06',
          numberOfLeaveDays: 2,
          remainingLeaveDays: 8,
          status: hrmState(request).leaveStatus.get('leave-001') ?? 'PENDING',
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.patch<{ employeeId: string }, Schema<'EmployeeUpdateRequest'>>(
    `${HRM_BASE_PATH}/employee/:employeeId`,
    async ({ request, params }) => {
      if (shouldError(request)) return error('Failed to update employee', 500);
      hrmState(request).employeeEdits.set(params.employeeId, await request.json());
      return okNoData();
    },
  ),
  http.patch<{ requestId: string }>(
    `${HRM_BASE_PATH}/leave/request/:requestId/release`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to approve leave', 500);
      hrmState(request).leaveStatus.set(params.requestId, 'APPROVED');
      return ok(null);
    },
  ),
  http.patch<{ requestId: string }>(
    `${HRM_BASE_PATH}/leave/request/:requestId/reject`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to reject leave', 500);
      hrmState(request).leaveStatus.set(params.requestId, 'REJECTED');
      return ok(null);
    },
  ),
  http.post<PathParams, Schema<'CreateProgramRequest'>>(
    HRM_ENDPOINTS.PROGRAM,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to create program', 500);
      const state = hrmState(request);
      const body = await request.json();
      addCreated(state.createdPrograms, (serial) => ({
        ...SEED_PROGRAM,
        programId: `prog-${serial}`,
        programName: body.programName,
        category: body.category,
        trainingHour: body.trainingHour,
        isOnline: body.isOnline,
        capacity: body.capacity,
      }));
      return ok(null);
    },
  ),
  http.patch<{ programId: string }, ProgramEdit>(
    `${HRM_BASE_PATH}/program/:programId`,
    async ({ request, params }) => {
      if (shouldError(request)) return error('Failed to update program', 500);
      const { programName, statusCode } = await request.json();
      hrmState(request).programEdits.set(params.programId, { programName, statusCode });
      return ok(null);
    },
  ),
  http.post<{ employeeId: string }, { programId: string }>(
    `${HRM_BASE_PATH}/program/:employeeId`,
    async ({ request, params }) => {
      if (shouldError(request)) return error('Failed to assign program', 500);
      const { assignedPrograms } = hrmState(request);
      const { programId } = await request.json();
      const assigned = assignedPrograms.get(params.employeeId) ?? [];
      assignedPrograms.set(params.employeeId, assigned);
      // 같은 프로그램을 또 지정하면 이력을 늘리지 않고 성공으로 답한다(실서버 동작 미확인)
      if (!assigned.includes(programId)) addCreated(assigned, () => programId);
      return ok(null);
    },
  ),
  http.put<{ timerecordId: string }, TimeRecordEdit>(
    `${HRM_BASE_PATH}/time-record/:timerecordId`,
    async ({ request, params }) => {
      if (shouldError(request)) return error('Failed to update time record', 500);
      const { checkInTime, checkOutTime } = await request.json();
      hrmState(request).timeRecordEdits.set(params.timerecordId, { checkInTime, checkOutTime });
      return ok(null);
    },
  ),
  http.post<PathParams, Schema<'PayRollCompleteRequestParams'>>(
    HRM_ENDPOINTS.PAYROLL_COMPLETE,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to complete payroll', 500);
      hrmState(request).paidPayrolls.add((await request.json()).payrollId);
      return ok(null);
    },
  ),
  http.post<PathParams, Schema<'EmployeeRegisterRequest'>>(
    HRM_ENDPOINTS.EMPLOYEE_SIGNUP,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to register employee', 500);
      const state = hrmState(request);
      const body = await request.json();
      addCreated(state.createdEmployees, (serial) => ({
        ...SEED_EMPLOYEE,
        employeeId: `emp-${serial}`,
        employeeNumber: `EMP-2026-${serial}`,
        name: body.name,
        email: body.email,
        phone: body.phoneNumber,
        position: nameOf(POSITIONS, body.positionId),
        department: nameOf(DEPARTMENTS, body.departmentId),
        hireDate: body.hireDate,
        birthDate: body.birthDate,
        address: `${body.baseAddress} ${body.detailAddress}`,
      }));
      return ok(null);
    },
  ),
  http.get(HRM_ENDPOINTS.DEPARTMENTS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load departments dropdown', 500);
    return ok(DEPARTMENTS);
  }),
  http.get(`${HRM_BASE_PATH}/:departmentId/positions/all`, ({ request }) => {
    if (shouldError(request)) return error('Failed to load positions dropdown', 500);
    return ok(POSITIONS);
  }),
  http.get(HRM_ENDPOINTS.ATTENDANCE_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load attendance status dropdown', 500);
    return ok([
      { key: 'ON_TIME', value: '정상' },
      { key: 'LATE', value: '지각' },
    ]);
  }),
  http.get(`${HRM_BASE_PATH}/departments/:departmentId/members`, ({ request }) => {
    if (shouldError(request)) return error('Failed to load dept members dropdown', 500);
    return ok([{ key: 'emp-001', value: '홍길동' }]);
  }),
  http.get(HRM_ENDPOINTS.PAYROLL_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load payroll status dropdown', 500);
    // key 는 게이트웨이 enum PayrollStatus. 목록의 statusCode 필터로 그대로 간다(HrmController.java:349)
    return ok([
      { key: 'PAYROLL_UNPAID', value: '미지급' },
      { key: 'PAYROLL_PAID', value: '지급완료' },
    ]);
  }),
  http.get(HRM_ENDPOINTS.TRAINING_CATE_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load training categories dropdown', 500);
    return ok([
      { key: 'SAFETY', value: '안전' },
      { key: 'SKILL', value: '기술' },
    ]);
  }),
  http.get(HRM_ENDPOINTS.PROGRAM_LIST_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load program dropdown', 500);
    return ok(PROGRAMS);
  }),
  http.get(HRM_ENDPOINTS.PROGRAM_COMPLETION_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load program completion dropdown', 500);
    return ok([
      { key: 'COMPLETED', value: '완료' },
      { key: 'INCOMPLETED', value: '미완료' },
    ]);
  }),
];
