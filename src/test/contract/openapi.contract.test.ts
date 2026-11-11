// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import * as z from 'zod';
import openapiTS, { astToString } from 'openapi-typescript';
import { getResponse } from 'msw';
import { handlers } from '@/mocks/handlers';
import { API_BASE_URL, WAREHOUSE_ENDPOINTS } from '@/app/types/api';
import { loadContract, type Contract } from './loadContract';

/**
 * OpenAPI 계약(`openapi/everp.yaml`)이 원본이다(OpenAPI 계약 1 카드).
 * 1. 화면이 부르는 요청이 계약에 있다.
 * 2. 목(MSW) 응답이 계약의 응답 스키마를 만족한다. 계약을 zod 로 바꿔 런타임에 확인한다.
 * 3. 커밋된 생성 타입이 계약과 같다(drift 검사).
 */
const CONTRACT = 'openapi/everp.yaml';
const GENERATED = 'src/lib/api/openapi.gen.ts';
const ORIGIN = 'http://localhost';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** 화면 주소(`/api/proxy/...`)를 계약 경로 템플릿(`/scm-pp/iv/warehouses/{warehouseId}`)에 맞춘다 */
const findPath = (paths: Record<string, unknown>, url: string) => {
  const pathname = url.replace(API_BASE_URL, '').split('?')[0];
  return Object.keys(paths).find((template) =>
    new RegExp(`^${template.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(pathname),
  );
};

// 계약 YAML 의 스키마 노드. 모양은 z.fromJSONSchema 가 다시 확인한다
const jsonSchema = z.custom<z.core.JSONSchema.JSONSchema>(
  (value) => typeof value === 'object' && value !== null,
);

/** 계약의 200 응답 스키마를 zod 로. `#/components/schemas/X` 참조는 `$defs` 로 옮긴다 */
const responseSchema = (contract: Contract, path: string, method: Method) => {
  const operation = z
    .object({
      responses: z.object({
        '200': z.object({
          content: z.object({ 'application/json': z.object({ schema: z.unknown() }) }),
        }),
      }),
    })
    .parse(contract.paths[path][method]);
  const relink = (value: unknown): unknown =>
    JSON.parse(JSON.stringify(value).replaceAll('#/components/schemas/', '#/$defs/'));
  const root = jsonSchema.parse(
    relink(operation.responses['200'].content['application/json'].schema),
  );
  const defs = z.record(z.string(), jsonSchema).parse(relink(contract.components.schemas));
  return z.fromJSONSchema({ ...root, $defs: defs });
};

const mockJson = async (url: string) => {
  const response = await getResponse(handlers, new Request(new URL(url, ORIGIN)), {
    baseUrl: ORIGIN,
  });
  if (!response) throw new Error(`목 핸들러 없음: ${url}`);
  return response.json();
};

// 창고 화면이 부르는 요청(warehouse.api.ts)
const WAREHOUSE_CALLS: [Method, string][] = [
  ['get', WAREHOUSE_ENDPOINTS.STATS],
  ['get', WAREHOUSE_ENDPOINTS.WAREHOUSE_LIST],
  ['get', WAREHOUSE_ENDPOINTS.WAREHOUSE_DETAIL('wh-001')],
  ['post', WAREHOUSE_ENDPOINTS.ADD_WAREHOUSE],
  ['put', WAREHOUSE_ENDPOINTS.WAREHOUSE_MANAGE('wh-001')],
  ['get', WAREHOUSE_ENDPOINTS.WAREHOUSE_MANAGER_INFO],
];

describe('OpenAPI 계약: 창고', () => {
  it('화면이 부르는 창고 요청이 전부 계약에 있다', () => {
    const contract = loadContract();
    const missing = WAREHOUSE_CALLS.filter(([method, url]) => {
      const path = findPath(contract.paths, url);
      return !path || !contract.paths[path][method];
    }).map(([method, url]) => `${method.toUpperCase()} ${url}`);
    expect(missing).toEqual([]);
  });

  it('창고 GET 응답(MSW)이 계약의 응답 스키마를 만족한다', async () => {
    const contract = loadContract();
    const failures: string[] = [];
    for (const [method, url] of WAREHOUSE_CALLS.filter(([m]) => m === 'get')) {
      const path = findPath(contract.paths, url);
      if (!path) {
        failures.push(`계약에 없음: ${url}`);
        continue;
      }
      const result = responseSchema(contract, path, method).safeParse(await mockJson(url));
      if (!result.success) failures.push(`${url}: ${z.prettifyError(result.error)}`);
    }
    expect(failures).toEqual([]);
  });

  it('커밋된 생성 타입이 계약과 같다(drift)', async () => {
    const generated = astToString(await openapiTS(new URL(`file://${process.cwd()}/${CONTRACT}`)));
    const committed = existsSync(GENERATED) ? readFileSync(GENERATED, 'utf8') : '';
    // 생성 파일 머리의 주석과 prettier 차이를 빼고 비교한다
    const body = (source: string) => source.replace(/\s+/g, '').replace(/^\/\*\*.*?\*\//, '');
    expect(body(committed)).toBe(body(generated));
  });
});

// ---------- 전 도메인(OpenAPI 계약 2 카드) ----------

const API_FILES = [
  'src/app/(private)/dashboard/dashboard.api.ts',
  'src/app/(private)/finance/finance.api.ts',
  'src/app/(private)/hrm/api/hrm.api.ts',
  'src/app/(private)/inventory/inventory.api.ts',
  'src/app/(private)/low-stock/lowStock.api.ts',
  'src/app/(private)/production/api/production.api.ts',
  'src/app/(private)/purchase/api/purchase.api.ts',
  'src/app/(private)/sales/sales.api.ts',
  'src/app/(private)/warehouse/warehouse.api.ts',
  'src/lib/api/notification.api.ts',
];

const ENDPOINT_MODULES = [
  'src/app/types/api.ts',
  'src/app/(private)/hrm/api/hrm.endpoints.ts',
  'src/app/(private)/production/api/production.endpoints.ts',
  'src/app/(private)/purchase/api/purchase.endpoints.ts',
  'src/lib/api/notification.endpoints.ts',
];

/** `HRM_ENDPOINTS.EMPLOYEE_DETAIL` → 실제 주소. 함수형은 아무 값이나 넣어 부른다 */
const loadEndpointUrls = async () => {
  const urls = new Map<string, string>();
  for (const file of ENDPOINT_MODULES) {
    const mod: Record<string, unknown> = await import(path.join(process.cwd(), file));
    for (const [name, value] of Object.entries(mod)) {
      if (!name.endsWith('_ENDPOINTS') || typeof value !== 'object' || value === null) continue;
      for (const [key, endpoint] of Object.entries(value)) {
        const url =
          typeof endpoint === 'function'
            ? String(endpoint('id-1', 'id-2'))
            : typeof endpoint === 'string'
              ? endpoint
              : null;
        if (url) urls.set(`${name}.${key}`, url);
      }
    }
  }
  return urls;
};

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const usedEndpointNames = () =>
  new Set(
    API_FILES.flatMap((file) => [
      // 주석 처리된 옛 코드의 상수는 세지 않는다
      ...stripComments(readFileSync(file, 'utf8')).matchAll(
        /\b([A-Z_]+_ENDPOINTS)\.([A-Z0-9_]+)\b/g,
      ),
    ]).map((m) => `${m[1]}.${m[2]}`),
  );

describe('OpenAPI 계약: 전 도메인', () => {
  it('api 파일이 쓰는 엔드포인트가 전부 계약에 있다', async () => {
    const contract = loadContract();
    const urls = await loadEndpointUrls();
    const missing = [...usedEndpointNames()].filter((name) => {
      const url = urls.get(name);
      return !url || !findPath(contract.paths, url);
    });
    expect(missing).toEqual([]);
  });

  it('계약의 GET 응답 전부가 MSW 응답과 맞는다', async () => {
    const contract = loadContract();
    const gets = Object.keys(contract.paths).filter((p) => contract.paths[p].get);
    expect(gets.length).toBeGreaterThan(60);
    const failures: string[] = [];
    for (const template of gets) {
      const url = `${API_BASE_URL}${template.replace(/\{[^}]+\}/g, 'id-1')}`;
      const result = responseSchema(contract, template, 'get').safeParse(await mockJson(url));
      if (!result.success) failures.push(`${template}: ${z.prettifyError(result.error)}`);
    }
    expect(failures).toEqual([]);
  });
});

describe('OpenAPI 계약: 통계 추이(시각화 1)', () => {
  it('통계 응답의 지표마다 기간 길이에 맞는 추이가 있고 마지막 점이 지금 값이다', async () => {
    const body = (await mockJson(WAREHOUSE_ENDPOINTS.STATS)) as {
      data: Record<string, Record<string, { value: number; trend?: number[] }>>;
    };
    const lengths: Record<string, number> = { week: 7, month: 5, quarter: 13, year: 12 };
    for (const [period, stats] of Object.entries(body.data)) {
      for (const stat of Object.values(stats)) {
        expect(stat.trend).toHaveLength(lengths[period]);
        expect(stat.trend?.at(-1)).toBe(stat.value);
      }
    }
  });
});

/**
 * 영업 매출 분석 실패 카드(2026-11-11)의 고객 등록 응답. 게이트웨이 SdController.java:210 은
 * `ApiResponse<CreateAuthUserResultDto>` 를 돌려준다(봉투 한 겹). data 는 CreateAuthUserResultDto.java:8-12 의
 * eventId, transactionId, success, userId, failureReason 이다. 예전 계약은 봉투 안에 봉투를 또 두고
 * 숫자 customerId, customerCode 를 요구했다.
 */
describe('OpenAPI 계약: 영업 고객 등록 응답', () => {
  const CUSTOMER_CREATE = '/business/sd/customers';

  it('POST 200 의 data 가 게이트웨이 CreateAuthUserResultDto 필드만 선언한다', () => {
    const contract = loadContract();
    const response = responseSchema(contract, CUSTOMER_CREATE, 'post');
    const gateway = {
      status: 200,
      success: true,
      message: '고객사 등록이 완료되었습니다.',
      data: {
        eventId: 'evt-1',
        transactionId: 'tx-1',
        success: true,
        userId: 'user-1',
        failureReason: null,
      },
    };
    expect(response.safeParse(gateway).success).toBe(true);
    const dataSchema = z
      .object({ properties: z.record(z.string(), z.unknown()) })
      .parse(contract.components.schemas.CreateCustomerResponse);
    expect(Object.keys(dataSchema.properties).sort()).toEqual([
      'eventId',
      'failureReason',
      'success',
      'transactionId',
      'userId',
    ]);
  });

  it('고객 등록 POST 응답(MSW)이 계약의 응답 스키마를 만족한다', async () => {
    const contract = loadContract();
    const url = `${API_BASE_URL}${CUSTOMER_CREATE}`;
    const response = await getResponse(
      handlers,
      new Request(new URL(url, ORIGIN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: '신규상사' }),
      }),
      { baseUrl: ORIGIN },
    );
    if (!response) throw new Error(`목 핸들러 없음: POST ${url}`);
    const result = responseSchema(contract, CUSTOMER_CREATE, 'post').safeParse(
      await response.json(),
    );
    expect(result.success ? [] : [z.prettifyError(result.error)]).toEqual([]);
  });
});

/**
 * 같은 카드. 고객 수정 요청의 담당자 키는 등록 요청과 같은 name, mobile, email 이다(FE 커밋 2e17263 실서버 테스트).
 * 게이트웨이 수정 컨트롤러는 Map 으로 받아 그대로 넘긴다(SdController.java:311). 등록 요청은
 * CustomerCreateRequestDto.java:18 의 ManagerDto(name, mobile, email)다.
 */
describe('OpenAPI 계약: 영업 고객 담당자 요청 키', () => {
  const managerKeys = (schemaName: string) =>
    Object.keys(
      z
        .object({
          properties: z.object({
            manager: z.object({ properties: z.record(z.string(), z.unknown()) }),
          }),
        })
        .parse(loadContract().components.schemas[schemaName]).properties.manager.properties,
    ).sort();

  it('수정 요청 manager 는 name, mobile, email', () => {
    expect(managerKeys('CustomerEditData')).toEqual(['email', 'mobile', 'name']);
  });

  it('등록 요청 manager 는 name, mobile, email', () => {
    expect(managerKeys('CustomerData')).toEqual(['email', 'mobile', 'name']);
  });
});
