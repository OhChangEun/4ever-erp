// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import * as z from 'zod';
import openapiTS, { astToString } from 'openapi-typescript';
import { getResponse } from 'msw';
import { handlers } from '@/mocks/handlers';
import { API_BASE_URL, WAREHOUSE_ENDPOINTS } from '@/app/types/api';

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

const loadContract = () => {
  if (!existsSync(CONTRACT)) throw new Error(`${CONTRACT} 가 없다`);
  return z
    .object({
      paths: z.record(z.string(), z.record(z.string(), z.unknown())),
      components: z.object({ schemas: z.record(z.string(), z.unknown()) }),
    })
    .parse(parse(readFileSync(CONTRACT, 'utf8')));
};

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
const responseSchema = (
  contract: ReturnType<typeof loadContract>,
  path: string,
  method: Method,
) => {
  const operation = z
    .object({
      responses: z.object({
        '200': z.object({
          content: z.object({ 'application/json': z.object({ schema: z.unknown() }) }),
        }),
      }),
    })
    .parse(contract.paths[path]?.[method]);
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
      return !path || !contract.paths[path]?.[method];
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
