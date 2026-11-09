import { HttpHandler, type RequestHandler } from 'msw';
import { scenarioHandler } from './scenario';
import { authHandlers } from './handlers/auth.handlers';
import { dashboardHandlers } from './handlers/dashboard.handlers';
import { salesHandlers } from './handlers/sales.handlers';
import { financeHandlers } from './handlers/finance.handlers';
import { inventoryHandlers } from './handlers/inventory.handlers';
import { purchaseHandlers } from './handlers/purchase.handlers';
import { productionHandlers } from './handlers/production.handlers';
import { hrmHandlers } from './handlers/hrm.handlers';

const domainHandlers: RequestHandler[] = [
  ...authHandlers,
  ...dashboardHandlers,
  ...salesHandlers,
  ...financeHandlers,
  ...inventoryHandlers,
  ...purchaseHandlers,
  ...productionHandlers,
  ...hrmHandlers,
];

/** `:param` 이나 `*` 가 들어간 경로인가. 구체 경로가 아니면 뒤로 보낸다 */
const isPattern = (handler: RequestHandler) => {
  if (!(handler instanceof HttpHandler)) return false;
  const { path } = handler.info;
  return typeof path !== 'string' || path.includes(':') || path.includes('*');
};

/**
 * MSW 는 등록 순서대로 맞춰 본다. `payroll/:payrollId` 가 `payroll/statuses` 보다 앞에 있으면
 * 상태 목록 요청이 상세로 간다(목 한 벌 카드에서 3건). 구체 경로를 패턴 경로보다 앞에 둔다.
 * 정렬은 안정 정렬이라 같은 종류끼리는 도메인 파일의 순서를 지킨다. 시나리오 스위치는 늘 맨 앞.
 */
export const handlers: RequestHandler[] = [
  scenarioHandler,
  ...domainHandlers.filter((handler) => !isPattern(handler)),
  ...domainHandlers.filter(isPattern),
];
