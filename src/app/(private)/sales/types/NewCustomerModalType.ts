import type { Schema } from '@/lib/api/contract';
import type { paths } from '@/lib/api/openapi.gen';
export type CustomerData = Schema<'CustomerData'>;

// 게이트웨이 CreateAuthUserResultDto(봉투 한 겹 안의 data). 고객 필드는 오지 않는다
export type CreateCustomerResponse = Schema<'CreateCustomerResponse'>;

/** 고객 등록 200 응답 전체(봉투). data 는 빠질 수 있다(게이트웨이 NON_NULL) */
export type CreateCustomerEnvelope =
  paths['/business/sd/customers']['post']['responses'][200]['content']['application/json'];
