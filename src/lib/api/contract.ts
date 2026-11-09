import type { components, paths } from './openapi.gen';

/**
 * OpenAPI 계약(`openapi/everp.yaml`)에서 만든 타입을 짧게 꺼내는 별칭(OpenAPI 계약 1 카드).
 * 도메인 타입 파일은 응답 모양을 손으로 쓰지 않고 이것으로 가리킨다.
 */
export type Schema<Name extends keyof components['schemas']> = components['schemas'][Name];

/** GET 요청의 쿼리 파라미터 */
export type QueryOf<Path extends keyof paths> = paths[Path] extends {
  get: { parameters: { query?: infer Query } };
}
  ? NonNullable<Query>
  : never;
