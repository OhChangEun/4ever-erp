// 상태 글자는 messages/{ko,en}.json 의 status 에 있다(i18n 1 카드). 여기는 색만
export const STATUS_COLOR_MAP: Record<string, string> = {
  REQUEST_APPROVED: 'bg-green-100 text-green-700 border-green-300',
  ORDER_APPROVED: 'bg-green-100 text-green-700 border-green-300',
  PAYROLL_PAID: 'bg-green-100 text-green-700 border-green-300',
  PAYROLL_UNPAID: 'bg-red-100 text-red-700 border-red-300',

  ANNUAL: 'bg-green-100 text-green-700 border-green-300',
  SICK: 'bg-blue-100 text-blue-700 border-blue-300',

  CONVERTED: 'bg-green-100 text-green-700 border-green-300',
  NOT_REQUIRED: 'bg-gray-100 text-gray-700 border-gray-300',
  NOT_CONVERTED: 'bg-blue-100 text-blue-700 border-blue-300',

  TECHNICAL_TRAINING: 'bg-blue-100 text-blue-700 border-blue-300',
  BASIC_TRAINING: 'bg-blue-100 text-blue-700 border-blue-300',

  APPROVED: 'bg-green-100 text-green-700 border-green-300',
  APPROVAL: 'bg-green-100 text-green-700 border-green-300',
  ACTIVE: 'bg-green-100 text-green-700 border-green-300',
  SUFFICIENT: 'bg-green-100 text-green-700 border-green-300',

  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  IN_PROCESS: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  RESPONSE_PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-300',

  REJECTED: 'bg-red-100 text-red-700 border-red-300',
  DEACTIVE: 'bg-gray-100 text-gray-700 border-gray-300',
  INSUFFICIENT: 'bg-red-100 text-red-700 border-red-300',

  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  COMPLETE: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  READY_FOR_SHIPMENT: 'bg-green-100 text-green-700 border-green-300',
  DELIVERED: 'bg-green-100 text-green-700 border-green-300',
  RECEIVED: 'bg-emerald-100 text-emerald-700 border-emerald-300',

  DELIVERING: 'bg-blue-100 text-blue-700 border-blue-300',
  IN_PRODUCTION: 'bg-orange-100 text-orange-700 border-orange-300',
  MATERIAL_PREPARATION: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  READY_TO_SHIP: 'bg-green-100 text-green-700 border-green-300',

  CAUTION: 'bg-orange-100 text-orange-700 border-orange-300',
  URGENT: 'bg-orange-100 text-orange-700 border-orange-300',
  LATE: 'bg-orange-100 text-orange-700 border-orange-300',

  NEW: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  PLANNED: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  RECRUITING: 'bg-indigo-100 text-indigo-700 border-indigo-300',

  CHECKED: 'bg-sky-100 text-sky-700 border-sky-300',
  UNCHECKED: 'bg-gray-100 text-gray-600 border-gray-300',

  PAID: 'bg-green-100 text-green-700 border-green-300',
  UNPAID: 'bg-red-100 text-red-700 border-red-300',

  PASS: 'bg-blue-100 text-blue-700 border-blue-300',
  FAIL: 'bg-red-100 text-red-600 border-red-300',
  STOCK_SUFFICIENT: 'bg-green-100 text-green-700 border-green-300',

  DEFAULT: 'bg-gray-100 text-gray-600 border-gray-300',

  입고: 'bg-green-100 text-green-700 border-green-300',
  출고: 'bg-red-100 text-red-700 border-red-300',
  이동: 'bg-blue-100 text-blue-700 border-blue-300',
};

export const getStatusColor = (status: string): string =>
  STATUS_COLOR_MAP[status ?? ''] ?? STATUS_COLOR_MAP.DEFAULT;
