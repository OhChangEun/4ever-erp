import { http } from 'msw';
import { HRM_BASE_PATH, HRM_ENDPOINTS } from '@/app/(private)/hrm/api/hrm.endpoints';
import { ok, okNoData, error, shouldError, isoNow, makePage, stat, statResponse } from './utils';

const mockHrmStats = statResponse({
  totalEmployeeCount: stat,
  newEmployeeCount: stat,
});

export const hrmHandlers = [
  http.get(HRM_ENDPOINTS.STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load HRM stats', 500);
    return ok(mockHrmStats);
  }),
  http.get(HRM_ENDPOINTS.EMPLOYEE, ({ request }) => {
    if (shouldError(request)) return error('Failed to load employees', 500);
    return ok({
      content: [
        {
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
        },
      ],
      page: makePage(0, 10, 1),
    });
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
  http.patch(`${HRM_BASE_PATH}/departments/:departmentId`, ({ request }) => {
    if (shouldError(request)) return error('Failed to update department', 500);
    return ok(null);
  }),
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
            statusCode: 'PENDING',
          },
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.get(`${HRM_BASE_PATH}/payroll/:payrollId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load payroll detail', 500);
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
      statusCode: 'PENDING',
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
          inProgressCount: 1,
          requiredMissingCount: 0,
          lastTrainingDate: '2026-01-05',
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.get(`${HRM_BASE_PATH}/training/employee/:employeeId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load training detail', 500);
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
      ],
    });
  }),
  http.get(HRM_ENDPOINTS.PROGRAM, ({ request }) => {
    if (shouldError(request)) return error('Failed to load program list', 500);
    return ok({
      content: [
        {
          programId: 'prog-001',
          programName: '안전 교육',
          statusCode: 'ACTIVE',
          category: 'SAFETY',
          trainingHour: 4,
          isOnline: true,
          capacity: 30,
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.get(`${HRM_BASE_PATH}/program/:programId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load program detail', 500);
    return ok({
      programId: params.programId,
      programName: '안전 교육',
      statusCode: 'ACTIVE',
      category: 'SAFETY',
      trainingHour: 4,
      isOnline: true,
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
          status: 'PENDING',
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.patch(`${HRM_BASE_PATH}/employee/:employeeId`, ({ request }) => {
    if (shouldError(request)) return error('Failed to update employee', 500);
    return okNoData();
  }),
  http.patch(`${HRM_BASE_PATH}/leave/request/:requestId/release`, ({ request }) => {
    if (shouldError(request)) return error('Failed to approve leave', 500);
    return ok(null);
  }),
  http.patch(`${HRM_BASE_PATH}/leave/request/:requestId/reject`, ({ request }) => {
    if (shouldError(request)) return error('Failed to reject leave', 500);
    return ok(null);
  }),
  http.post(HRM_ENDPOINTS.PROGRAM, ({ request }) => {
    if (shouldError(request)) return error('Failed to create program', 500);
    return ok(null);
  }),
  http.patch(`${HRM_BASE_PATH}/program/:programId`, ({ request }) => {
    if (shouldError(request)) return error('Failed to update program', 500);
    return ok(null);
  }),
  http.post(`${HRM_BASE_PATH}/program/:employeeId`, ({ request }) => {
    if (shouldError(request)) return error('Failed to assign program', 500);
    return ok(null);
  }),
  http.put(`${HRM_BASE_PATH}/time-record/:timerecordId`, ({ request }) => {
    if (shouldError(request)) return error('Failed to update time record', 500);
    return ok(null);
  }),
  http.post(HRM_ENDPOINTS.PAYROLL_COMPLETE, ({ request }) => {
    if (shouldError(request)) return error('Failed to complete payroll', 500);
    return ok(null);
  }),
  http.post(HRM_ENDPOINTS.EMPLOYEE_SIGNUP, ({ request }) => {
    if (shouldError(request)) return error('Failed to register employee', 500);
    return ok(null);
  }),
  http.get(HRM_ENDPOINTS.DEPARTMENTS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load departments dropdown', 500);
    return ok([
      { key: 'dept-001', value: '영업팀' },
      { key: 'dept-002', value: '구매팀' },
    ]);
  }),
  http.get(`${HRM_BASE_PATH}/:departmentId/positions/all`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load positions dropdown', 500);
    return ok([
      { key: 'pos-001', value: '팀장' },
      { key: 'pos-002', value: '사원' },
    ]);
  }),
  http.get(HRM_ENDPOINTS.ATTENDANCE_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load attendance status dropdown', 500);
    return ok([
      { key: 'ON_TIME', value: '정상' },
      { key: 'LATE', value: '지각' },
    ]);
  }),
  http.get(`${HRM_BASE_PATH}/departments/:departmentId/members`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load dept members dropdown', 500);
    return ok([{ key: 'emp-001', value: '홍길동' }]);
  }),
  http.get(HRM_ENDPOINTS.PAYROLL_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load payroll status dropdown', 500);
    return ok([
      { key: 'PENDING', value: '대기' },
      { key: 'PAID', value: '지급완료' },
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
    return ok([{ key: 'prog-001', value: '안전 교육' }]);
  }),
  http.get(HRM_ENDPOINTS.PROGRAM_COMPLETION_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load program completion dropdown', 500);
    return ok([
      { key: 'COMPLETED', value: '완료' },
      { key: 'INCOMPLETED', value: '미완료' },
    ]);
  }),
];
