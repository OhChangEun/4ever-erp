// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { HttpHandler, matchRequestUrl } from 'msw';
import { handlers } from '@/mocks/handlers';
import {
  API_BASE_URL,
  INVENTORY_ENDPOINTS,
  PROFILE_BASE_PATH,
  PROFILE_ENDPOINTS,
  SALES_ENDPOINTS,
  USER_ENDPOINTS,
} from '@/app/types/api';
import {
  PRODUCTION_BASE_PATH,
  PRODUCTION_ENDPOINTS,
} from '@/app/(private)/production/api/production.endpoints';
import { applyAllMockWrites } from './mockApi';

const ORIGIN = 'http://localhost';

/**
 * 계약 테스트의 "쓰기를 전부 한 뒤"가 글자 그대로인지 본다(목이 쓰기 결과를 따르게 리뷰 P2).
 * 쓰기 핸들러를 목 핸들러 목록에서 세고, `applyAllMockWrites` 가 그중 결과를 기억하는 것 전부에 요청을 보냈는지 맞춰 본다.
 * 쓰기 핸들러를 새로 만들면 이 테스트가 실패한다. `applyAllMockWrites` 에 넣거나 아래 목록에 이유와 함께 적는다.
 */
const NOT_SENT: Array<[method: string, url: string, why: string]> = [
  ['POST', USER_ENDPOINTS.LOGIN, '상태 없음'],
  ['POST', USER_ENDPOINTS.LOGOUT, '상태 없음'],
  ['PATCH', `${API_BASE_URL}/alarm/notifications/all/read`, '알림 목이 자기 저장소를 쓴다'],
  ['PATCH', `${API_BASE_URL}/alarm/notifications/ntf-001/read`, '알림 목이 자기 저장소를 쓴다'],
  ['POST', PROFILE_ENDPOINTS.VACATION, '프로필 목은 아직 결과를 기억하지 않는다(카드 별도 보고)'],
  ['POST', `${PROFILE_BASE_PATH}/trainings/request`, '프로필 목'],
  ['PATCH', PROFILE_ENDPOINTS.CHECK_IN, '프로필 목'],
  ['PATCH', PROFILE_ENDPOINTS.CHECK_OUT, '프로필 목'],
  ['POST', PROFILE_ENDPOINTS.EDIT_PROFILE, '프로필 목'],
  ['POST', SALES_ENDPOINTS.INVENTORY_CHECK, '계산 요청. 서버 상태를 안 바꾼다'],
  ['POST', INVENTORY_ENDPOINTS.MATERIALS_LIST, 'POST 지만 읽기'],
  ['POST', INVENTORY_ENDPOINTS.ADD_MATERIALS, '자재 추가는 반영하지 않는다(카드 조사 1)'],
  ['POST', PRODUCTION_ENDPOINTS.QUOTATION_SIMULATE, '계산 요청'],
  ['POST', PRODUCTION_ENDPOINTS.QUOTATION_PREVIEW, '계산 요청'],
  [
    'POST',
    `${PRODUCTION_BASE_PATH}/boms/bom-001/simulate-conflict`,
    '테스트 전용. 응답이 공통 래퍼가 아니다',
  ],
];

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const writeHandlers = handlers
  .filter((handler): handler is HttpHandler => handler instanceof HttpHandler)
  .filter((handler) => WRITE_METHODS.includes(String(handler.info.method)));

/** 이 요청들 중 하나라도 핸들러의 메서드와 경로에 맞는가 */
const matchesAny = (handler: HttpHandler, requests: Array<{ method: string; url: string }>) => {
  const { method, path } = handler.info;
  if (typeof path !== 'string' && !(path instanceof RegExp)) return false;
  return requests.some(
    (request) =>
      request.method === method &&
      matchRequestUrl(new URL(request.url, ORIGIN), path, ORIGIN).matches,
  );
};

describe('applyAllMockWrites', () => {
  it('결과를 기억하는 쓰기 핸들러 40개 전부에 요청을 보내고, 응답이 전부 성공이다', async () => {
    const sent = await applyAllMockWrites();
    expect(sent.filter((write) => !write.ok)).toEqual([]);

    const sentRequests = sent.map((write) => ({
      method: write.method,
      url: `${API_BASE_URL}${write.path}`,
    }));
    const notSent = NOT_SENT.map(([method, url]) => ({ method, url }));

    const covered = writeHandlers.filter((handler) => matchesAny(handler, sentRequests));
    const unaccounted = writeHandlers
      .filter((handler) => !matchesAny(handler, sentRequests) && !matchesAny(handler, notSent))
      .map((handler) => `${String(handler.info.method)} ${String(handler.info.path)}`);

    expect(unaccounted).toEqual([]);
    expect(covered).toHaveLength(40);
    expect(writeHandlers).toHaveLength(40 + NOT_SENT.length);
  });
});
