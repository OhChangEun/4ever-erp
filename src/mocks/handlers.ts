import { authHandlers } from './handlers/auth.handlers';
import { dashboardHandlers } from './handlers/dashboard.handlers';
import { salesHandlers } from './handlers/sales.handlers';
import { financeHandlers } from './handlers/finance.handlers';
import { inventoryHandlers } from './handlers/inventory.handlers';
import { purchaseHandlers } from './handlers/purchase.handlers';
import { productionHandlers } from './handlers/production.handlers';
import { hrmHandlers } from './handlers/hrm.handlers';

export const handlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...salesHandlers,
  ...financeHandlers,
  ...inventoryHandlers,
  ...purchaseHandlers,
  ...productionHandlers,
  ...hrmHandlers,
];
