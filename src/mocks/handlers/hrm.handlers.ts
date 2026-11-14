import { http, type PathParams } from 'msw';
import { HRM_BASE_PATH, HRM_ENDPOINTS } from '@/app/(private)/hrm/api/hrm.endpoints';
import type { Schema } from '@/lib/api/contract';
import { addCreated, mockState } from '../state';
import { HEADCOUNT, attendanceDays } from './attendanceSummary.handlers';
import { DEPARTMENTS, EMPLOYEES, addDays, departmentIdOf, todayKey } from './seed';
import {
  ok,
  okNoData,
  error,
  notFound,
  shouldError,
  makePage,
  paged,
  filterBy,
  hashUnit,
  newestFirst,
  level,
  statResponse,
  type FilterRules,
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
  /** 새 프로그램 id → 시작일(상세가 보인다) */
  programStarts: Map<string, string>;
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
  programStarts: new Map(),
  assignedPrograms: new Map(),
  timeRecordEdits: new Map(),
}));

// 드롭다운 목과 직원 수정, 등록이 같은 이름표를 쓴다. 부서는 직원 씨앗과 같은 여섯(`seed.ts`)
const POSITIONS = [
  { key: 'pos-001', value: '팀장' },
  { key: 'pos-002', value: '사원' },
];
/** 직급의 월 기본급. 직급 목록의 payment 이고 급여의 기본급이다(verified=false, 서버 급여 규칙을 모른다) */
const PAYMENT: Partial<Record<string, number>> = { 팀장: 5_000_000, 사원: 3_200_000 };
/** 모르는 id 는 id 를 그대로 보인다 */
const nameOf = (options: Array<{ key: string; value: string }>, id: string) =>
  options.find((option) => option.key === id)?.value ?? id;
const positionIdOf = (name: string) => POSITIONS.find((option) => option.value === name)?.key ?? '';

/** 직원 씨앗 42명(카드 "데모 데이터 채우기"). emp-001 홍길동은 예전 값 그대로다 */
const SEED_EMPLOYEE: Employee = EMPLOYEES[0];
/** 씨앗의 재직자 40명. 출퇴근의 지각, 결근, 휴가와 교육 대상자는 이 사람들에서 고른다(쓰기와 무관하게 늘 같다) */
const SEED_STAFF = EMPLOYEES.filter((employee) => employee.statusCode === 'ACTIVE');
const serialOf = (employeeId: string) => employeeId.slice('emp-'.length);

/** 직원 목록. 씨앗과 그 로그인이 등록한 직원에 수정한 이름, 부서, 직급을 덮는다 */
const employeesOf = (request: Request) => {
  const state = hrmState(request);
  return [...EMPLOYEES, ...state.createdEmployees].map((employee) => {
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
};
/**
 * 재직자(카드 "데모 목록 인사 재무" 결정 3). 부서, 직급, 급여, 교육 현황, 출퇴근은 재직자만 센다.
 * 씨앗이면 40명이라 인사 통계의 직원 수(HEADCOUNT)와 같다
 */
const staffOf = (request: Request) =>
  employeesOf(request).filter((employee) => employee.statusCode === 'ACTIVE');
/** 급여와 출퇴근 행의 직원 칸 */
const summaryOf = (employee: Employee) => ({
  employeeId: employee.employeeId,
  employeeName: employee.name,
  departmentId: departmentIdOf(employee.department),
  department: employee.department,
  positionId: positionIdOf(employee.position),
  position: employee.position,
});

// ---------- 부서 ----------

/** [설명, 위치, 설립일]. 부서 순서는 DEPARTMENTS 와 같다 */
const DEPARTMENT_INFO: Array<[string, string, string]> = [
  ['B2B 영업', '서울 강남', '2020-01-01'],
  ['원자재와 부품 구매', '서울 강남', '2020-01-01'],
  ['1, 2공장 생산', '경기 화성', '2020-03-02'],
  ['회계와 자금', '서울 강남', '2020-01-01'],
  ['채용과 교육', '서울 강남', '2020-06-01'],
  ['창고와 출고', '경기 평택', '2021-04-01'],
];

/**
 * 부서 목록(결정 3). 인원과 부서원은 직원 목록의 그 부서 재직자, 부서장은 부서 팀장. 수정한 부서장 id 와 설명을 덮고
 * 부서장 이름은 그 id 의 직원 이름이다
 */
const departmentsOf = (request: Request) => {
  const employees = employeesOf(request);
  const staff = employees.filter((employee) => employee.statusCode === 'ACTIVE');
  const { departmentEdits } = hrmState(request);
  return DEPARTMENTS.map(({ key, value }, d) => {
    const [description, location, establishedDate] = DEPARTMENT_INFO[d];
    // 부서장도 인원과 같은 출처(수정이 덮인 재직자)에서 찾는다(리뷰 A1)
    const leader = staff.find((row) => row.department === value && row.position === '팀장');
    const edit = departmentEdits.get(key);
    const managerId = edit?.managerId ?? leader?.employeeId ?? '';
    const members = staff.filter((employee) => employee.department === value);
    return {
      departmentId: key,
      departmentNumber: `D-${key.slice('dept-'.length)}`,
      departmentName: value,
      description: edit?.description ?? description,
      managerName: employees.find((row) => row.employeeId === managerId)?.name ?? null,
      managerId,
      location,
      statusCode: 'ACTIVE',
      employeeCount: members.length,
      establishedDate,
      employees: members.map((employee) => ({
        employeeId: employee.employeeId,
        employeeName: employee.name,
        position: employee.position,
        hireDate: employee.hireDate,
      })),
    };
  });
};

/** 직급 목록. 인원은 그 직급 재직자 */
const positionsOf = (request: Request) => {
  const staff = staffOf(request);
  return POSITIONS.map(({ key, value }) => ({
    positionId: key,
    positionName: value,
    headCount: staff.filter((employee) => employee.position === value).length,
    payment: PAYMENT[value] ?? 0,
  }));
};

// ---------- 급여 ----------

/** 요청의 연월(YYYY-MM). 화면은 늘 year, month 를 보낸다(게이트웨이 필수, HrmController.java:345-348). 없으면 이번 달 */
const monthOf = (request: Request) => {
  const params = new URL(request.url).searchParams;
  const [year, month] = [params.get('year'), params.get('month')];
  return year && month ? `${year}-${month.padStart(2, '0')}` : todayKey().slice(0, 7);
};

/**
 * 한 달 급여(결정 4). 그 달 말까지 입사한 재직자마다 한 장. 기본급 = 직급 급여, 연장 수당은 사람과 달로 정해지는 0~40만 원,
 * 공제는 4대 보험 4.5%와 소득세 4.9%(10원 단위). 이번 달 뒤는 없다. 지난달까지는 지급완료, 이번 달은 미지급이고
 * 지급 완료 쓰기를 덮는다(verified=false)
 */
const payrollsOf = (request: Request, month: string) => {
  const thisMonth = todayKey().slice(0, 7);
  if (month > thisMonth) return [];
  const { paidPayrolls } = hrmState(request);
  return staffOf(request)
    .filter((employee) => employee.hireDate <= `${month}-31`)
    .map((employee) => {
      const payrollId = `pay-${month.replace('-', '')}-${serialOf(employee.employeeId)}`;
      const basePay = PAYMENT[employee.position] ?? 0;
      const overtimePay = Math.floor(hashUnit(payrollId) * 41) * 10_000;
      const insurance = Math.round(((basePay + overtimePay) * 0.045) / 10) * 10;
      const tax = Math.round(((basePay + overtimePay) * 0.049) / 10) * 10;
      const deduction = insurance + tax;
      return {
        payrollId,
        employee: summaryOf(employee),
        pay: {
          basePay,
          overtimePay,
          deduction,
          netPay: basePay + overtimePay - deduction,
          statusCode:
            month < thisMonth || paidPayrolls.has(payrollId) ? 'PAYROLL_PAID' : 'PAYROLL_UNPAID',
        },
        items: { insurance, tax },
      };
    });
};

// ---------- 교육 ----------

type ProgramRow = [string, string, number, boolean, number, string, string];
/**
 * 교육 프로그램 12개 [이름, 분류, 시간, 온라인, 정원, 상태, 시작일](결정 5). 상태는 계약 enum TrainingStatus
 * (RECRUITING, IN_PROGRESS, COMPLETED)에 예전 목 값 하나. 응답이 Map 프록시라 서버 값은 verified=false
 */
const PROGRAM_ROWS: ProgramRow[] = [
  ['안전 교육', 'SAFETY', 4, true, 30, 'IN_PROGRESS', '2026-02-01'],
  ['화재 대피 훈련', 'SAFETY', 2, false, 40, 'COMPLETED', '2026-03-12'],
  ['ERP 사용자 교육', 'SYSTEM', 3, true, 40, 'COMPLETED', '2026-03-03'],
  ['지게차 안전 운전', 'SAFETY', 8, false, 12, 'COMPLETED', '2026-04-07'],
  ['품질 관리 기초', 'QUALITY', 6, true, 25, 'COMPLETED', '2026-05-14'],
  ['ISO 9001 내부 심사원', 'QUALITY', 16, false, 15, 'COMPLETED', '2026-06-09'],
  ['정보보안 인식', 'SYSTEM', 2, true, 40, 'COMPLETED', '2026-07-01'],
  ['불량 분석 실무', 'QUALITY', 8, false, 20, 'IN_PROGRESS', '2026-10-20'],
  ['개인정보 보호', 'SYSTEM', 2, true, 40, 'IN_PROGRESS', '2026-11-03'],
  ['산업 안전 보건', 'SAFETY', 4, false, 30, 'RECRUITING', '2026-12-01'],
  ['엑셀 데이터 분석', 'SYSTEM', 6, true, 25, 'RECRUITING', '2026-12-08'],
  ['6시그마 그린벨트', 'QUALITY', 24, false, 15, 'RECRUITING', '2027-01-12'],
];
const SEED_PROGRAMS: Program[] = PROGRAM_ROWS.map(
  ([programName, category, trainingHour, isOnline, capacity, statusCode], i) => ({
    programId: `prog-${String(i + 1).padStart(3, '0')}`,
    programName,
    statusCode,
    category,
    trainingHour,
    isOnline,
    capacity,
  }),
);
const SEED_PROGRAM: Program = SEED_PROGRAMS[0];
const PROGRAM_START = new Map(SEED_PROGRAMS.map((row, i) => [row.programId, PROGRAM_ROWS[i][6]]));

/**
 * 씨앗 프로그램의 대상자와 이수 상태(결정 5). 모집 중이 아닌 프로그램마다 재직자 중 해시가 정원 비율보다 작은 사람을
 * 직원 번호 순으로 정원까지. 끝난 프로그램은 대상자 열에 아홉이 이수(COMPLETED, 이수일 = 시작일), 진행 중은 미이수
 */
const SEED_HISTORY = SEED_PROGRAMS.flatMap((program) =>
  program.statusCode === 'RECRUITING'
    ? []
    : SEED_STAFF.filter(
        (employee) =>
          hashUnit(`${program.programId}:${employee.employeeId}`) <
          program.capacity / SEED_STAFF.length,
      )
        .slice(0, program.capacity)
        .map((employee) => {
          const done =
            program.statusCode === 'COMPLETED' &&
            hashUnit(`${program.programId}:${employee.employeeId}:done`) < 0.9;
          return {
            employeeId: employee.employeeId,
            programId: program.programId,
            programStatus: done ? 'COMPLETED' : 'INCOMPLETED',
            completedAt: done ? (PROGRAM_START.get(program.programId) ?? '') : '',
          };
        }),
);
/** 필수 교육: 끝난 전 직원 대상(정원이 재직자 수 이상) 프로그램. 이수 못 한 수가 교육 현황의 필수 미이수 수다 */
const REQUIRED_PROGRAMS = SEED_PROGRAMS.filter(
  (program) => program.statusCode === 'COMPLETED' && program.capacity >= SEED_STAFF.length,
);

/** 교육 프로그램 목록. 기본 행과 새 행에 수정한 이름, 상태를 덮는다 */
const programsOf = (request: Request) => {
  const state = hrmState(request);
  return [...SEED_PROGRAMS, ...state.createdPrograms].map((program) => ({
    ...program,
    ...state.programEdits.get(program.programId),
  }));
};

/** 직원 한 사람의 교육 이력. 씨앗 이력에 그 로그인이 지정한 프로그램(미이수)을 더한다. 이미 있는 프로그램은 다시 넣지 않는다 */
const historyOf = (request: Request, employeeId: string) => {
  const programs = programsOf(request);
  const seed = SEED_HISTORY.filter((row) => row.employeeId === employeeId);
  const assigned = (hrmState(request).assignedPrograms.get(employeeId) ?? [])
    .filter((programId) => !seed.some((row) => row.programId === programId))
    .map((programId) => ({ employeeId, programId, programStatus: 'INCOMPLETED', completedAt: '' }));
  return [...seed, ...assigned].map((row) => ({
    ...row,
    programName: nameOf(
      programs.map((program) => ({ key: program.programId, value: program.programName })),
      row.programId,
    ),
  }));
};
/** 교육 현황 한 줄의 수. 마지막 교육일은 이수일 중 가장 늦은 날(없으면 빈 글자) */
const trainingCounts = (history: ReturnType<typeof historyOf>) => ({
  completedCount: history.filter((row) => row.programStatus === 'COMPLETED').length,
  inProgressCount: history.filter((row) => row.programStatus === 'INCOMPLETED').length,
  requiredMissingCount: REQUIRED_PROGRAMS.filter(
    (program) =>
      !history.some(
        (row) => row.programId === program.programId && row.programStatus === 'COMPLETED',
      ),
  ).length,
  lastTrainingDate: history.reduce(
    (last, row) => (row.completedAt > last ? row.completedAt : last),
    '',
  ),
});

// ---------- 출퇴근과 휴가 ----------

/**
 * 한 근무일의 출근부(결정 6). 근태 집계(`attendanceDays`)의 그날 지각, 결근, 휴가 수만큼 씨앗 재직자를 날짜 해시 순으로
 * 고른다. 집계에 없는 날(주말, 12주 앞, 오늘 뒤)은 undefined
 */
const rosterOf = (date: string) => {
  const day = attendanceDays().days.find((row) => row.date === date);
  if (!day) return undefined;
  const order = [...SEED_STAFF].sort(
    (a, b) => hashUnit(`${date}:${a.employeeId}`) - hashUnit(`${date}:${b.employeeId}`),
  );
  const ids = (from: number, count: number) =>
    new Set(order.slice(from, from + count).map((employee) => employee.employeeId));
  return {
    late: ids(0, day.late),
    away: ids(day.late, day.absent + day.onLeave),
    onLeave: order.slice(day.late + day.absent, day.late + day.absent + day.onLeave),
  };
};

const clock = (date: string, minutes: number) =>
  `${date}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`;

/**
 * 그날 출퇴근 기록. 그날까지 입사한 재직자 중 결근, 휴가를 뺀 사람. 정상은 08:20~08:59, 지각은 09:05~09:50 출근,
 * 퇴근 18:00~20:29. 근무 시간은 출근부터 퇴근까지, 연장은 18시 뒤(verified=false). 오늘도 퇴근까지 채운다
 */
const timeRecordsOf = (request: Request, date: string) => {
  const roster = rosterOf(date);
  if (!roster) return [];
  const { timeRecordEdits } = hrmState(request);
  return staffOf(request)
    .filter((employee) => employee.hireDate <= date && !roster.away.has(employee.employeeId))
    .map((employee) => {
      const timerecordId = `time-${date.replace(/-/g, '')}-${serialOf(employee.employeeId)}`;
      const late = roster.late.has(employee.employeeId);
      const h = (what: string) => hashUnit(`${timerecordId}:${what}`);
      const checkIn = late ? 545 + Math.floor(h('in') * 46) : 500 + Math.floor(h('in') * 40);
      const checkOut = 1080 + Math.floor(h('out') * 150);
      return {
        timerecordId,
        employee: summaryOf(employee),
        workDate: date,
        checkInTime: clock(date, checkIn),
        checkOutTime: clock(date, checkOut),
        // 근무 시간과 지각 여부는 수정 뒤 다시 계산하지 않는다(서버 규칙을 모른다)
        ...timeRecordEdits.get(timerecordId),
        totalWorkMinutes: checkOut - checkIn,
        overtimeMinutes: checkOut - 1080,
        statusCode: late ? 'LATE' : 'ON_TIME',
      };
    });
};

const isWeekend = (date: string) => [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());
/** 그날이 주말이면 다음 월요일 */
const weekdayFrom = (date: string) => {
  let day = date;
  while (isWeekend(day)) day = addDays(day, 1);
  return day;
};
/** 시작일에서 근무일 days 일째 되는 날 */
const lastWorkday = (start: string, days: number) => {
  let day = start;
  for (let left = days - 1; left > 0; left -= 1) day = weekdayFrom(addDays(day, 1));
  return day;
};

/** 앞으로의 휴가 신청 [직원, 종류, 오늘에서 며칠 뒤, 근무일 수, 상태]. id 는 leave-001 부터 */
const LEAVE_ROWS: Array<[string, string, number, number, string]> = [
  ['emp-001', 'ANNUAL', 5, 2, 'PENDING'],
  ['emp-009', 'SICK', 1, 1, 'PENDING'],
  ['emp-017', 'ANNUAL', 12, 3, 'PENDING'],
  ['emp-025', 'ANNUAL', 8, 1, 'APPROVED'],
  ['emp-030', 'ANNUAL', 3, 2, 'REJECTED'],
  ['emp-038', 'ANNUAL', 19, 1, 'PENDING'],
];
/** 연차 한 해 일수(verified=false). 남은 일수 = 이 값 - 그 사람의 승인 휴가 일수 */
const ANNUAL_DAYS = 15;

/**
 * 휴가 목록(결정 6). 근태 집계 12주의 휴가 인원은 그날 출근부의 휴가자가 낸 하루짜리 승인 휴가이고(그래서 그날 출퇴근
 * 목록에 없다), 앞으로의 신청 6건(대기, 승인, 반려)이 더해진다. 시작일 최신순(게이트웨이 sortOrder 기본 DESC,
 * 정렬 칸은 verified=false). 승인, 반려 쓰기를 덮는다
 */
const leavesOf = (request: Request) => {
  const today = todayKey();
  const employees = employeesOf(request);
  const { leaveStatus } = hrmState(request);
  const past = attendanceDays().days.flatMap(({ date }) =>
    (rosterOf(date)?.onLeave ?? []).map((employee) => ({
      leaveRequestId: `leave-${date.replace(/-/g, '')}-${serialOf(employee.employeeId)}`,
      employeeId: employee.employeeId,
      leaveType: hashUnit(`${date}:${employee.employeeId}:type`) < 0.2 ? 'SICK' : 'ANNUAL',
      startDate: date,
      endDate: date,
      numberOfLeaveDays: 1,
      status: 'APPROVED',
    })),
  );
  const upcoming = LEAVE_ROWS.map(([employeeId, leaveType, after, days, status], i) => {
    const startDate = weekdayFrom(addDays(today, after));
    return {
      leaveRequestId: `leave-${String(i + 1).padStart(3, '0')}`,
      employeeId,
      leaveType,
      startDate,
      endDate: lastWorkday(startDate, days),
      numberOfLeaveDays: days,
      status,
    };
  });
  const rows = [...past, ...upcoming].map((row) => ({
    ...row,
    status: leaveStatus.get(row.leaveRequestId) ?? row.status,
  }));
  const used = (employeeId: string) =>
    rows
      .filter((row) => row.employeeId === employeeId && row.status === 'APPROVED')
      .reduce((sum, row) => sum + row.numberOfLeaveDays, 0);
  return rows
    .map(({ employeeId, ...row }) => {
      const employee =
        employees.find((person) => person.employeeId === employeeId) ?? SEED_EMPLOYEE;
      return {
        leaveRequestId: row.leaveRequestId,
        employee: {
          employeeId,
          employeeName: employee.name,
          department: employee.department,
          position: employee.position,
        },
        leaveType: row.leaveType,
        startDate: row.startDate,
        endDate: row.endDate,
        numberOfLeaveDays: row.numberOfLeaveDays,
        remainingLeaveDays: ANNUAL_DAYS - used(employeeId),
        status: row.status,
      };
    })
    .sort(
      newestFirst(
        (row) => row.startDate,
        (row) => row.leaveRequestId,
      ),
    );
};

/**
 * 직원 수는 근태 집계 목의 인원이다(카드 "목 데이터 현실성" 결정 4). 씨앗 재직자 수와 같다.
 * 신규 입사자는 직원 목록의 입사일로 세지 않고 한 달에 2명꼴로 둔다(verified=false)
 */
const mockHrmStats = statResponse({
  totalEmployeeCount: level(HEADCOUNT),
  newEmployeeCount: { week: 0, month: 2, quarter: 5, year: 18 },
});

/**
 * 목록 필터(카드 "목 필터와 검색"). 이름은 게이트웨이와 같다(HrmController.java:120-125, :345-356, 출퇴근 :43-52,
 * 휴가 :111-118, 교육 현황 :246-251). 부서는 부서 id(dept-001~006)로 오고 행에는 부서 이름이 있어 id 로 바꿔 견준다.
 * 이름 검색은 name 파라미터, 부분 일치. 급여 year, month 와 출퇴근 date 는 그 달, 그날의 행을 만드는 데 쓴다
 * (카드 "데모 목록 인사 재무")
 */
type Person = { department: string; name: string };
const personFilter = <T>(person: (row: T) => Person, statusCode?: (row: T) => string) =>
  ({
    equals: {
      department: (row: T) => departmentIdOf(person(row).department),
      departmentId: (row: T) => departmentIdOf(person(row).department),
      ...(statusCode && { statusCode }),
    },
    search: { name: (row: T) => person(row).name },
    keywordParam: 'name',
  }) satisfies FilterRules<T>;
const EMPLOYEE_FILTER = personFilter<Employee>((row) => row);
type HrmRow = { employee: { department: string; employeeName: string } };
const employeeOf = (row: HrmRow): Person => ({
  department: row.employee.department,
  name: row.employee.employeeName,
});

export const hrmHandlers = [
  http.get(HRM_ENDPOINTS.STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load HRM stats', 500);
    return ok(mockHrmStats);
  }),
  http.get(HRM_ENDPOINTS.EMPLOYEE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load employees', 500);
    return ok(paged(request, filterBy(request, employeesOf(request), EMPLOYEE_FILTER)));
  }),
  http.get(HRM_ENDPOINTS.POSITIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load positions', 500);
    return ok(positionsOf(request));
  }),
  http.get<{ positionId: string }>(
    `${HRM_BASE_PATH}/positions/:positionId`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to load position detail', 500);
      // 직급 목록에 없는 id 는 404(카드 "없는 건은 404")
      const position = positionsOf(request).find((row) => row.positionId === params.positionId);
      if (!position) return notFound('직급 상세 조회');
      return ok({
        ...position,
        employees: staffOf(request)
          .filter((employee) => employee.position === position.positionName)
          .map((employee) => ({
            ...summaryOf(employee),
            employeeCode: employee.employeeNumber,
            hireDate: employee.hireDate,
          })),
      });
    },
  ),
  http.get(HRM_ENDPOINTS.DEPARTMENTS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load departments', 500);
    return ok({ content: departmentsOf(request) });
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
    const rows = payrollsOf(request, monthOf(request)).map(({ items: _items, ...row }) => row);
    return ok(
      paged(
        request,
        filterBy(
          request,
          rows,
          personFilter<(typeof rows)[number]>(employeeOf, (row) => row.pay.statusCode),
        ),
      ),
    );
  }),
  http.get<{ payrollId: string }>(`${HRM_BASE_PATH}/payroll/:payrollId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load payroll detail', 500);
    // id 가 pay-<연월>-<직원 순번>이라 그 달 급여에서 찾는다. 모양이 다르거나 그 달 목록에 없으면 404
    const yyyymm = /^pay-(\d{4})(\d{2})-\d+$/.exec(params.payrollId);
    const payroll = yyyymm
      ? payrollsOf(request, `${yyyymm[1]}-${yyyymm[2]}`).find(
          (row) => row.payrollId === params.payrollId,
        )
      : undefined;
    if (!payroll) return notFound('급여 명세서 상세 조회');
    const { basePay, overtimePay, deduction, netPay, statusCode } = payroll.pay;
    return ok({
      payrollId: payroll.payrollId,
      employee: payroll.employee,
      pay: {
        basePay,
        basePayItem: [{ itemContent: '기본급', itemSum: basePay }],
        overtimePay,
        overtimePayItem: [{ itemContent: '연장근무', itemSum: overtimePay }],
        deduction,
        deductionItem: [
          { itemContent: '4대 보험', itemSum: payroll.items.insurance },
          { itemContent: '소득세', itemSum: payroll.items.tax },
        ],
        netPay,
      },
      statusCode,
      expectedDate: `${yyyymm?.[1]}-${yyyymm?.[2]}-25`,
    });
  }),
  http.get(HRM_ENDPOINTS.TRAINING_STATUS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load training list', 500);
    const rows = staffOf(request).map((employee) => {
      const { lastTrainingDate, ...counts } = trainingCounts(
        historyOf(request, employee.employeeId),
      );
      return {
        employeeId: employee.employeeId,
        name: employee.name,
        department: employee.department,
        position: employee.position,
        ...counts,
        lastTrainingDate: lastTrainingDate || null,
      };
    });
    const { content, page } = paged(
      request,
      filterBy(
        request,
        rows,
        personFilter<(typeof rows)[number]>((row) => row),
      ),
    );
    return ok({ items: content, page });
  }),
  http.get<{ employeeId: string }>(
    `${HRM_BASE_PATH}/training/employee/:employeeId`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to load training detail', 500);
      // 교육 현황 목록(재직자)에 없으면 404
      const employee = staffOf(request).find((row) => row.employeeId === params.employeeId);
      if (!employee) return notFound('직원 교육 이력 조회');
      const history = historyOf(request, employee.employeeId);
      const { completedCount, requiredMissingCount, lastTrainingDate } = trainingCounts(history);
      return ok({
        employeeId: employee.employeeId,
        employeeName: employee.name,
        department: employee.department,
        position: employee.position,
        completedCount,
        requiredMissingCount,
        lastTrainingDate,
        programHistory: history.map(({ programId, programName, programStatus, completedAt }) => ({
          programId,
          programName,
          programStatus,
          completedAt,
        })),
      });
    },
  ),
  http.get(HRM_ENDPOINTS.PROGRAM, ({ request }) => {
    if (shouldError(request)) return error('Failed to load program list', 500);
    return ok(paged(request, programsOf(request)));
  }),
  http.get<{ programId: string }>(`${HRM_BASE_PATH}/program/:programId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load program detail', 500);
    // 목록의 그 행에서 만든다. 그 로그인의 목록에 없으면 404
    const program = programsOf(request).find((row) => row.programId === params.programId);
    if (!program) return notFound('교육 프로그램 상세 조회');
    // 대상자는 직원마다의 교육 이력에서 그 프로그램이 있는 사람이다(교육 상세와 같은 상태)
    const designatedEmployee = employeesOf(request).flatMap((employee) => {
      const row = historyOf(request, employee.employeeId).find(
        (entry) => entry.programId === program.programId,
      );
      return row
        ? [
            {
              employeeId: employee.employeeId,
              employeeName: employee.name,
              department: employee.department,
              position: employee.position,
              statusCode: row.programStatus,
              completedAt: row.completedAt || null,
            },
          ]
        : [];
    });
    return ok({
      programId: params.programId,
      programName: program.programName,
      statusCode: program.statusCode,
      category: program.category,
      trainingHour: program.trainingHour,
      isOnline: program.isOnline,
      startDate:
        PROGRAM_START.get(program.programId) ??
        hrmState(request).programStarts.get(program.programId) ??
        '',
      designatedEmployee,
      ...makePage(0, Math.max(designatedEmployee.length, 1), designatedEmployee.length),
    });
  }),
  http.get(HRM_ENDPOINTS.TIME_RECORD, ({ request }) => {
    if (shouldError(request)) return error('Failed to load attendance list', 500);
    // 화면은 늘 날짜를 보낸다(게이트웨이 필수). 없으면 근태 집계의 마지막 근무일(주말에도 빈 목록이 아니게)
    const date =
      new URL(request.url).searchParams.get('date') || (attendanceDays().days.at(-1)?.date ?? '');
    const rows = timeRecordsOf(request, date);
    return ok(
      paged(
        request,
        filterBy(
          request,
          rows,
          personFilter<(typeof rows)[number]>(employeeOf, (row) => row.statusCode),
        ),
      ),
    );
  }),
  http.get(HRM_ENDPOINTS.LEAVE_REQUESTS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load leave list', 500);
    const rows = leavesOf(request);
    return ok(
      paged(request, filterBy(request, rows, personFilter<(typeof rows)[number]>(employeeOf))),
    );
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
      // 새 프로그램 번호는 씨앗 12개 다음부터(직원 등록과 같다)
      addCreated(
        state.createdPrograms,
        (serial) => {
          state.programStarts.set(`prog-${serial}`, body.startDate);
          return {
            ...SEED_PROGRAM,
            programId: `prog-${serial}`,
            programName: body.programName,
            statusCode: 'RECRUITING',
            category: body.category,
            trainingHour: body.trainingHour,
            isOnline: body.isOnline,
            capacity: body.capacity,
          };
        },
        SEED_PROGRAMS.length + 1,
      );
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
      addCreated(
        state.createdEmployees,
        (serial) => ({
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
        }),
        EMPLOYEES.length + 1,
      );
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
  http.get<{ departmentId: string }>(
    `${HRM_BASE_PATH}/departments/:departmentId/members`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to load dept members dropdown', 500);
      // 부서 목록의 그 부서원(재직자)과 같다. 부서장을 고르는 드롭다운이 쓴다
      const department = departmentsOf(request).find(
        (row) => row.departmentId === params.departmentId,
      );
      return ok(
        (department?.employees ?? []).map((row) => ({
          key: row.employeeId,
          value: row.employeeName,
        })),
      );
    },
  ),
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
    // 교육 프로그램 목록과 같은 프로그램(새로 추가, 이름 수정 포함)
    return ok(programsOf(request).map((row) => ({ key: row.programId, value: row.programName })));
  }),
  http.get(HRM_ENDPOINTS.PROGRAM_COMPLETION_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load program completion dropdown', 500);
    return ok([
      { key: 'COMPLETED', value: '완료' },
      { key: 'INCOMPLETED', value: '미완료' },
    ]);
  }),
];
