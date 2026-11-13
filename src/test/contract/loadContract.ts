import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import * as z from 'zod';

/**
 * OpenAPI 계약(`openapi/everp.yaml`)을 읽는 공용 헬퍼. 계약 테스트들이 같이 쓴다.
 * 응답 스키마 확인(openapi.contract.test)과 쿼리 이름 확인(sales.contract.test)이 여기서 읽는다.
 */
const CONTRACT = 'openapi/everp.yaml';

const parameterSchema = z.object({
  name: z.string(),
  in: z.string(),
  schema: z
    .object({ enum: z.array(z.string()).optional() })
    .loose()
    .optional(),
});

export const loadContract = () => {
  if (!existsSync(CONTRACT)) throw new Error(`${CONTRACT} 가 없다`);
  return z
    .object({
      paths: z.record(z.string(), z.record(z.string(), z.unknown())),
      components: z.object({
        schemas: z.record(z.string(), z.unknown()),
        parameters: z.record(z.string(), parameterSchema).default({}),
        responses: z.record(z.string(), z.unknown()).default({}),
      }),
    })
    .parse(parse(readFileSync(CONTRACT, 'utf8')));
};

export type Contract = ReturnType<typeof loadContract>;

const getParametersSchema = z.object({ parameters: z.array(z.unknown()).optional() }).loose();
const refSchema = z.object({ $ref: z.string() });

/** 계약 경로의 GET 이 선언한 쿼리 파라미터. `#/components/parameters/X` 참조도 푼다 */
const declaredQueryParameters = (contract: Contract, contractPath: string) => {
  if (!(contractPath in contract.paths)) throw new Error(`계약에 ${contractPath} 가 없다`);
  const operation = contract.paths[contractPath].get;
  if (operation === undefined) throw new Error(`계약에 GET ${contractPath} 가 없다`);
  return (getParametersSchema.parse(operation).parameters ?? [])
    .map((entry) => {
      const ref = refSchema.safeParse(entry);
      if (!ref.success) return parameterSchema.parse(entry);
      const name = ref.data.$ref.replace('#/components/parameters/', '');
      if (!(name in contract.components.parameters))
        throw new Error(`계약에 없는 파라미터 참조: ${name}`);
      return contract.components.parameters[name];
    })
    .filter((parameter) => parameter.in === 'query');
};

/** 계약 경로의 GET 이 선언한 쿼리 파라미터 이름 */
export const declaredQueryNames = (contract: Contract, contractPath: string) =>
  declaredQueryParameters(contract, contractPath).map((parameter) => parameter.name);

/** 계약 경로의 GET 쿼리 파라미터 하나가 허용하는 값(enum). 선언이 없으면 빈 배열 */
export const declaredQueryEnum = (contract: Contract, contractPath: string, name: string) =>
  declaredQueryParameters(contract, contractPath).find((parameter) => parameter.name === name)
    ?.schema?.enum ?? [];
