import * as z from 'zod/mini';
import { pageSchema } from '@/lib/api/schemas';
import type { DepartmentsListResponse } from './types/HrmDepartmentsApiType';
import type { PayItemData, PayRollDetailResponse } from './types/HrmPayrollApiType';
import type { ProgramDetailResponse } from './types/HrmProgramApiType';
import type { AttendanceListResponse } from './types/HrmAttendanceApiType';
import type { TrainingListResponse } from './types/HrmTrainingApiType';

/**
 * 인사 GET 응답 스키마(타입 4차 카드). 화면이 null 가드를 두던 읽기만 확인한다.
 * 스키마는 기존 타입에 묶여 있어 타입이 바뀌면 여기도 컴파일 오류로 같이 고친다.
 */

/** 직원 요약. 급여 상세의 employee 와 출퇴근 목록의 employee 가 같은 모양이다 */
const employeeSummarySchema = z.looseObject({
  employeeId: z.string(),
  employeeName: z.string(),
  departmentId: z.string(),
  department: z.string(),
  positionId: z.string(),
  position: z.string(),
});

export const departmentsListSchema: z.ZodMiniType<DepartmentsListResponse> = z.looseObject({
  content: z.array(
    z.looseObject({
      departmentId: z.string(),
      departmentNumber: z.string(),
      departmentName: z.string(),
      description: z.nullish(z.string()),
      managerName: z.nullish(z.string()),
      managerId: z.string(),
      location: z.nullish(z.string()),
      statusCode: z.string(),
      employeeCount: z.number(),
      establishedDate: z.nullish(z.string()),
      employees: z.array(
        z.looseObject({
          employeeId: z.string(),
          employeeName: z.string(),
          position: z.string(),
          hireDate: z.string(),
        }),
      ),
    }),
  ),
});

const payItemSchema: z.ZodMiniType<PayItemData> = z.looseObject({
  itemContent: z.string(),
  itemSum: z.number(),
});

export const payrollDetailSchema: z.ZodMiniType<PayRollDetailResponse> = z.looseObject({
  payrollId: z.string(),
  employee: employeeSummarySchema,
  pay: z.looseObject({
    basePay: z.number(),
    basePayItem: z.array(payItemSchema),
    overtimePay: z.number(),
    overtimePayItem: z.array(payItemSchema),
    deduction: z.number(),
    deductionItem: z.array(payItemSchema),
    netPay: z.number(),
  }),
  statusCode: z.string(),
  expectedDate: z.string(),
});

export const programDetailSchema: z.ZodMiniType<ProgramDetailResponse> = z.looseObject({
  startDate: z.string(),
  designatedEmployee: z.array(
    z.looseObject({
      employeeId: z.string(),
      employeeName: z.string(),
      department: z.string(),
      position: z.string(),
      statusCode: z.string(),
      // 계약이 null 만 허용한다(openapi/everp.yaml designatedEmployeeSummary)
      completedAt: z.nullable(z.string()),
    }),
  ),
  number: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  programId: z.string(),
  programName: z.string(),
  statusCode: z.string(),
  category: z.string(),
  trainingHour: z.number(),
  isOnline: z.boolean(),
});

export const attendanceListSchema: z.ZodMiniType<AttendanceListResponse> = z.looseObject({
  content: z.array(
    z.looseObject({
      timerecordId: z.string(),
      // 출퇴근 목록의 직원은 이름과 직급이 비어 올 수 있다(급여 상세 직원은 그대로 엄격)
      employee: z.looseObject({
        ...employeeSummarySchema.def.shape,
        employeeName: z.nullish(z.string()),
        position: z.nullish(z.string()),
      }),
      workDate: z.string(),
      checkInTime: z.string(),
      checkOutTime: z.string(),
      totalWorkMinutes: z.number(),
      overtimeMinutes: z.number(),
      statusCode: z.string(),
    }),
  ),
  page: pageSchema,
});

export const trainingListSchema: z.ZodMiniType<TrainingListResponse> = z.looseObject({
  items: z.array(
    z.looseObject({
      employeeId: z.string(),
      name: z.string(),
      department: z.string(),
      position: z.string(),
      completedCount: z.number(),
      inProgressCount: z.number(),
      requiredMissingCount: z.number(),
      lastTrainingDate: z.nullish(z.string()),
    }),
  ),
  page: pageSchema,
});
