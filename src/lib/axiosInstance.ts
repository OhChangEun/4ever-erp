import axios from 'axios';
import { API_BASE_URL } from '@/app/types/api';
import { buildMockUser } from '@/lib/auth/simpleLogin';

axios.defaults.timeout = 4000;

// 인증 헤더를 여기서 붙이지 않는다.
// 브라우저는 세션 쿠키만 자동으로 보내고, Bearer 토큰은 /api/proxy 가 서버에서 교환한다.

const enableFallback = process.env.NEXT_PUBLIC_API_FALLBACK !== 'disabled';

const makePage = (page = 0, size = 10, totalElements = 0) => {
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  return {
    number: page,
    size,
    totalElements,
    totalPages,
    hasNext: page + 1 < totalPages,
  };
};

const statBlock = (value = 0) => ({ value, delta_rate: 0 });

const statResponse = (data: Record<string, unknown>) => ({
  week: data,
  month: data,
  quarter: data,
  year: data,
});

const safeParseJson = (value: unknown) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const buildFallbackData = (url: string, method: string, payload: unknown) => {
  if (url.endsWith('/api/login')) {
    return {
      accessToken: 'demo-access-token',
      user: buildMockUser('demo'),
    };
  }

  if (url.endsWith('/api/me')) {
    return buildMockUser('demo');
  }

  if (url.endsWith('/api/logout')) {
    return { status: 200, success: true, message: 'OK' };
  }

  if (url.includes('/dashboard/statistics')) {
    return statResponse({
      total_sales: statBlock(0),
      total_purchases: statBlock(0),
      net_profit: statBlock(0),
      total_employees: statBlock(0),
    });
  }

  if (url.includes('/dashboard/workflows')) {
    return { tabs: [] };
  }

  if (url.includes('/notifications/list')) {
    return { content: [], page: makePage(0, 10, 0) };
  }

  if (url.includes('/notifications/count')) {
    return { count: 0 };
  }

  if (url.includes('/business/sd/statistics')) {
    return statResponse({
      sales_amount: statBlock(0),
      new_orders_count: statBlock(0),
    });
  }

  if (url.includes('/quotations/customer/count')) {
    return statResponse({
      quotation_count: statBlock(0),
    });
  }

  if (url.includes('/business/fcm/statictics')) {
    return statResponse({
      total_purchases: statBlock(0),
      net_profit: statBlock(0),
      total_sales: statBlock(0),
    });
  }

  if (
    url.includes('/statistics/customer/total-purchases') ||
    url.includes('/statistics/supplier/total-sales')
  ) {
    return statResponse({
      total_amount: statBlock(0),
    });
  }

  if (url.includes('/scm-pp/mm/statistics')) {
    return statResponse({
      purchaseOrderAmount: statBlock(0),
      purchaseRequestCount: statBlock(0),
    });
  }

  if (url.includes('/scm-pp/mm/supplier/orders/statistics')) {
    return statResponse({
      orderCount: statBlock(0),
    });
  }

  if (url.includes('/scm-pp/pp/statistic')) {
    return statResponse({
      production_in: statBlock(0),
      production_completed: statBlock(0),
      bom_count: statBlock(0),
    });
  }

  if (url.includes('/scm-pp/iv/statistic')) {
    return statResponse({
      total_stock: statBlock(0),
      store_complete: statBlock(0),
      store_pending: statBlock(0),
      delivery_complete: statBlock(0),
      delivery_pending: statBlock(0),
    });
  }

  if (url.includes('/iv/shortage/count/critical/statistic')) {
    return statResponse({
      total_emergency: statBlock(0),
      total_warning: statBlock(0),
    });
  }

  if (url.includes('/iv/warehouses/statistic')) {
    return statResponse({
      total_warehouse: statBlock(0),
      in_operation_warehouse: statBlock(0),
    });
  }

  if (url.includes('/business/hrm/statistics')) {
    return statResponse({
      totalEmployeeCount: statBlock(0),
      newEmployeeCount: statBlock(0),
    });
  }

  if (url.includes('/statistics') || url.includes('/statictics')) {
    return statResponse({ total: statBlock(0) });
  }

  if (url.includes('/list') || url.includes('/quotations') || url.includes('/orders')) {
    return { content: [], page: makePage(0, 10, 0) };
  }

  if (method !== 'get' && payload) {
    return { received: payload };
  }

  return {};
};

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!enableFallback) {
      return Promise.reject(error);
    }

    const config = error?.config;
    const url = config?.url ?? '';

    if (!url || !url.startsWith(API_BASE_URL)) {
      return Promise.reject(error);
    }

    const method = (config?.method ?? 'get').toLowerCase();
    const payload = safeParseJson(config?.data);
    const data = buildFallbackData(url, method, payload);

    return Promise.resolve({
      data: {
        status: 200,
        success: true,
        message: 'fallback',
        data,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });
  },
);

export default axios;
