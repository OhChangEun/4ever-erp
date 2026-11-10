import * as z from 'zod/mini';
import type { DashboardWorkflowRes } from './types/DashboardWorkflowType';

/**
 * 대시보드 GET 응답 스키마(타입 4차 카드). 화면이 null 가드를 두던 읽기만 확인한다.
 * 스키마는 기존 타입에 묶여 있어 타입이 바뀌면 여기도 컴파일 오류로 같이 고친다.
 */

export const workflowStatusSchema: z.ZodMiniType<DashboardWorkflowRes> = z.looseObject({
  tabs: z.array(
    z.looseObject({
      tabCode: z.string(),
      items: z.array(
        z.looseObject({
          itemId: z.string(),
          itemTitle: z.string(),
          itemNumber: z.string(),
          name: z.string(),
          statusCode: z.string(),
          date: z.string(),
        }),
      ),
    }),
  ),
});
