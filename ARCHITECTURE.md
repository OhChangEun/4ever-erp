# ARCHITECTURE

이 문서는 이 레포를 처음 만지는 사람과 다음 AI 세션이 구조와 이유를 빠르게 잡도록 쓴 지도다. 규칙은 `CLAUDE.md`, 결정은 `ai/decisions.md`, 코드 규칙은 `ai/rules/`에 있고 여기엔 "무엇이 어디서 어떻게 흐르나"와 "왜 그렇게 돼 있나"만 적는다. 설명마다 `파일:줄` 앵커를 붙였다. 줄 번호는 2026-11-09 `refac/setup-block-1` 기준이고, 루프의 보고 단계에서 갱신한다.

## 1. 한 장 요약

Next.js 16 App Router 하나가 화면과 BFF(Backend for Frontend)를 겸한다. 브라우저는 세션 쿠키만 들고 다니고, 서버 라우트가 그 쿠키를 검증해 업스트림 API 를 대신 호출한다. 실 백엔드는 없고(팀 기간이 끝나 서버가 내려감) `BACKEND_API_URL` 이 비어 있으면 같은 앱 안의 목 API 가 응답한다.

```
브라우저 ──쿠키 session──▶ src/proxy.ts (페이지 RBAC)
   │                          └─▶ (private)/… 페이지
   │
   └─ axios ──/api/proxy/*──▶ src/app/api/proxy/[...path]/route.ts (세션 검증, API RBAC, Bearer 교환)
                                  ├─ BACKEND_API_URL 있음 → 실 서버
                                  └─ 없음 → src/app/api/[...slug]/route.ts (서버 목, MSW 핸들러 어댑터)
개발 시 NEXT_PUBLIC_API_MOCKING=enabled → MSW 서비스 워커가 브라우저에서 먼저 가로챔 (src/mocks/)
```

## 2. 요청 한 번의 경로

목록 화면이 데이터를 받기까지.

1. 도메인 `*.api.ts` 가 `*_ENDPOINTS` 상수로 URL 을 만든다. 기본 base 는 `/api/proxy` 다 (`src/app/types/api.ts:4`). 응답 래퍼는 `ApiResponse<T>` (`src/app/types/api.ts:14`).
2. 전역 axios 는 타임아웃 4초 (`src/lib/axiosInstance.ts:4`). 응답 인터셉터 하나가 두 가지를 한다. 2xx 인데 래퍼가 깨진 응답(`success === false`, GET 인데 `data` 없음)을 `invalidShape` 로 올리고 (`:22`), 실패는 전부 `AppError` 로 정규화해 reject 한다 (`:44`, 종류 9개는 `src/lib/AppError.ts:8`). 실패를 URL 별 빈 데이터로 바꿔치기하던 fallback 은 2026-11-09 에 지웠다(카드 `ai/cards/2026-11-09_오류를_빈_데이터로_숨기는_fallback_제거.md`). 화면은 `TableStatusBox` 와 `StatSection` 의 `error` prop 으로 종류별 한 줄을 덧붙인다 (`src/app/components/common/TableStatusBox.tsx:9`, `StatSection.tsx:20`).
3. `/api/proxy/[...path]` 가 받는다. 상태 변경 요청은 same-origin 검사 (`src/app/api/proxy/[...path]/route.ts:52`), 세션 쿠키 검증 (`:61`), 업스트림 base 결정 (`:43`, `:71`), 경로 정규화 뒤 도메인별 role 검사 (`:23` 규칙표, `:36` 인사 셀프서비스 예외), 쿠키를 떼고 `Authorization: Bearer` 를 붙여 fetch.
4. 업스트림이 없으면 `src/app/api/[...slug]/route.ts` 가 목 데이터를 돌려준다. 응답은 단위 테스트와 같은 MSW 핸들러가 만든다 (`:18` `getResponse`, 2026-11-10 목 한 벌 카드). 예전 손으로 쓴 서버 목 1,902줄은 지웠다.
5. 화면은 TanStack Query 로 받는다. 키는 도메인별 팩토리 (`src/app/(private)/purchase/api/purchase.keys.ts:6` 가 표준 모양: all → lists → list(params), details → detail(id)). 리터럴 키는 0건.

## 3. 인증과 인가 (지금)

- 로그인은 데모 계정 선택이다. `/api/auth/login` 이 `DEMO_ACCOUNTS` 에 있는 아이디면 통과시키고 (`src/app/api/auth/login/route.ts:35`) 세션을 연다 (`:47`). 세션 처리는 한 모듈이다 (`src/server/auth/session/index.ts:21`). 데모 저장소는 HS256 으로 서명한 JWT 를 httpOnly 쿠키 `session`(운영은 `__Host-session`, 서브도메인의 쿠키 바꿔치기 방지)에 심는다 (서명 `src/lib/auth/session.ts:40`, 검증 `:50`, 만료 1일 `:45`). OIDC 카드에서 sid 쿠키 + 서버 저장소 구현이 같은 경계(`SessionStore`)에 붙는다.
- 페이지 접근은 `src/proxy.ts` 가 막는다. 세션 확인 (`src/proxy.ts:12`) 뒤 역할 표로 판정 (`:24`). matcher 는 공개 경로만 빼는 denylist (`:34`). Next 16 부터 파일 이름이 `middleware.ts` 에서 `proxy.ts` 로 바뀌었고 Node 런타임이 기본이다.
- 권한 규칙은 표 하나다 (`src/lib/authz/policy.ts:66`). 페이지 프록시, API 프록시, 메뉴 2곳이 같이 읽는다. 역할은 `Role` 유니온 15개이고 목록 밖 역할이 든 세션은 무효다.
- 클라이언트 가드는 매 진입마다 `/api/auth/me` 로 확인하고 (`src/app/(private)/_PrivateGuard.tsx:20`, 사용자 타입은 `src/lib/auth/userInfo.ts`) 결과를 `authStore` 에 캐시한다. 이 스토어는 localStorage 에 persist 된다 (`src/store/authStore.ts:12`). 표시용 캐시일 뿐 권한 판단에 쓰지 않는다.
- 프록시는 세션 JWT 자체를 Bearer 로 보낸다. 실 IdP 토큰이 없어서다. 실 서버가 생기면 반드시 바뀐다 (4절).
- 공격 점검(BFF 문서 Phase 5)은 테스트로 고정했다: 같은 출처 판정 `src/lib/auth/sameOrigin.test.ts`, 프록시 우회와 401, 403 `src/app/api/proxy/[...path]/route.test.ts`, alg none `src/lib/auth/session.test.ts`, 오픈 리다이렉트 `src/lib/auth/returnTo.test.ts`, 콜백 재사용과 state 위조 `src/server/auth/oidcLogin.test.ts`.
- 알림 SSE 도 같은 프록시 주소로 붙어 세션 쿠키로 인증된다. 브라우저는 Authorization 헤더를 보내지 않는다 (`src/app/components/header/Notification/useNotificationSSE.ts:61`). 옛 SPA 시절 토큰 파일은 2026-11-10 지웠고 PKCE 도구만 서버 쪽 `src/server/auth/pkce.ts` 로 옮겼다(3단계 OIDC 클라이언트용).

## 4. 인증과 인가: OIDC 모드

`AUTH_PROVIDER=oidc` 면 BFF 가 OIDC confidential client 가 된다(2026-11-10 인증 4단계). 기본값 `demo` 는 3절 그대로라 Vercel 데모는 바뀌지 않는다. 세부 배경은 옵시디언 `프론트엔드/4ever-erp_아키텍처와_루프_계획_2026-11-09.md` 8절과 `4ever-erp_BFF_인증_진단과_실습계획.md` Part D.

```
src/server/auth/
  config.ts         AUTH_PROVIDER 와 OIDC env. IdP 는 쓰는 시점에 만든다
  idp/              IdentityProvider 인터페이스, oidc.ts(discovery, PKCE, JWKS 로 ID 토큰과 로그아웃 토큰 검증)
  session/          SessionStore. cookieStore(데모, 서명 JWT) / memoryStore(OIDC, sid 쿠키 + 서버 Map) / refresh.ts(single-flight)
  oidcLogin.ts      로그인 시작(state, nonce, verifier 를 10분 서명 쿠키에) / 콜백(state, nonce 확인, 역할 고르기)
  pkce.ts           code_verifier, S256 challenge
src/lib/authz/policy.ts   역할 표(3절)
src/app/api/auth/   login(GET 302, POST 데모), callback, me, logout(IdP 로그아웃 주소 반환), backchannel-logout
```

흐름:

1. `/login` 은 버튼 하나다. `/api/auth/login?returnTo=` 가 IdP 로 302 한다. state, nonce, PKCE verifier, returnTo 는 서명한 10분짜리 httpOnly 쿠키(`oidc_tx`, path `/api/auth`)에 있다.
2. 콜백(`src/server/auth/oidcLogin.ts:76`)이 state 를 비교하고 code 를 토큰으로 바꾼 뒤 ID 토큰을 JWKS 로 검증하고 nonce 를 비교한다. `realm_access.roles` 중 역할 표에 있는 첫 역할로 세션을 연다. 없으면 `/login?error=no_role`.
3. 쿠키에는 추측할 수 없는 sid(43자)만 있다. 토큰은 서버 메모리에 있다. API 프록시가 업스트림에 IdP access token 을 Bearer 로 붙인다.
4. access token 이 30초 안에 만료되면 API 프록시가 갱신한다 (`src/server/auth/session/index.ts:35`). 같은 sid 의 동시 요청은 갱신 하나를 같이 기다린다 (`src/server/auth/session/refresh.ts:28`). Keycloak 의 refresh token rotation 때문에 두 번 부르면 두 번째가 실패해 세션이 끊긴다. 갱신이 실패하면 세션을 지우고 401.
5. 로그아웃은 앱 세션을 지우고 IdP 로그아웃 주소(id_token_hint)를 돌려준다. 브라우저가 그 주소로 가야 IdP 세션도 끝나 SSO 로 바로 다시 들어오지 않는다.
6. IdP 에서 세션이 끊기면(관리자 강제 로그아웃 등) IdP 가 `/api/auth/backchannel-logout` 에 서명한 logout_token 을 보낸다. 그 사용자의 앱 세션을 지워 다음 요청이 401 이 된다.

한계: 메모리 저장소는 인스턴스 하나에서만 맞다(결정 9). Vercel 처럼 인스턴스가 여럿이면 외부 저장소(Redis 등)가 필요하다. 그래서 Vercel 은 데모 모드다. 페이지 프록시용 15분 role 클레임 쿠키도 그때 넣는다.

로컬에서 돌리기: `bash dev/keycloak/start.sh`(Keycloak 26.8.1, 포트 8180, realm 은 `dev/keycloak/everp-realm.json` 을 가져온다) 뒤 `pnpm dev:oidc`(앱 3100 포트. Keycloak 클라이언트의 콜백과 백채널 주소가 3100 하나다) 또는 `pnpm e2e:oidc`. 값은 `dev/keycloak/.env.keycloak`, `.env.oidc`(git 에 안 올림, 변수 목록은 `start.sh` 머리말). 확인 항목 5개(`e2e-oidc/oidc.spec.ts`): 로그인과 sid 쿠키, 역할 차단, 60초 토큰 두 번 갱신 중 동시 요청 5개, RP 로그아웃 뒤 Keycloak 로그인 화면, 백채널 로그아웃 뒤 401. Keycloak 이 없는 CI 는 돌리지 않는다.

## 5. 서버 상태 레이어

- QueryClient 는 한 팩토리 `createQueryClient` 에서 나온다 (`src/lib/queryClient.ts`). 서버 컴포넌트용 `cache()` 래퍼 `getQueryClient` (retry 0) 와 클라이언트 Provider (`src/app/providers.tsx`). 기본값은 staleTime 30초, gcTime 5분, 포커스 refetch 켬, retry 는 `AppError.kind` 가 network 나 server 일 때만 2회. 401 은 QueryCache 와 MutationCache 의 onError 한 곳에서 `redirectToLogin` (`src/lib/auth/redirectToLogin.ts`) 으로 보낸다(클라이언트당 1회, 전체 새로고침).
- 서버 prefetch → `HydrationBoundary` (`src/app/providers.tsx:29`) 패턴이 15곳에 있다. 전 도메인 확대 예정.
- 드롭다운 기준 데이터는 `staleTime: Infinity` (`src/app/hooks/useDropdown.tsx:18`). 마스터 수정 mutation 이 명시적으로 무효화해야 한다.
- 낙관적 락(version 전송)은 BOM 상태 변경에만 있다. 409 를 받으면 공통 빌더가 그 mutation 의 무효화 키를 다시 가져온다(`src/lib/query/useInvalidatingMutation.ts`, onError). 충돌 안내는 공통 `ConflictDialog`. 다른 엔티티의 version 전송은 OpenAPI 계약 카드.
- mutation 은 도메인 `*.mutations.ts` 훅으로 모은다. 훅은 같은 파일의 `*_MUTATION_EFFECTS` 표를 읽어 무효화하므로 표가 곧 동작이다. 컴포넌트는 토스트, confirm, 모달 닫기만 맡는다. 공통 빌더는 `src/lib/query/useInvalidatingMutation.ts`. 2026-11-09 구매 8, 인사 10, 생산 10, 재고 4, 영업 4, 재무 1, 창고 2, 프로필 5, 알림 2 완료. 컴포넌트 안 `useMutation` 은 0건이다(2026-11-10, `grep -rnE "useMutation[<(]"` 기준. 제네릭 형태 2건은 PR #18 에서 정리). 견적 시뮬레이션과 재고 확인처럼 버튼으로 한 번 하는 요청도 도메인 훅으로 둔다. 읽기는 `useQuery` 로 하고 결과를 state 에 복사하지 않는다.

  구매 무효화 매트릭스 (코드 `PURCHASE_MUTATION_EFFECTS` 를 옮긴 것. 다르면 코드가 맞다):

  | mutation                   | 다시 가져오는 키                                                                                                                                 |
  | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
  | 발주 승인, 반려, 배송 시작 | `purchaseOrderKeys.lists()`, `purchaseOrderKeys.detail(id)`, `purchaseStatsKeys.all`                                                             |
  | 구매 요청 승인             | `purchaseRequestKeys.lists()`, `.detail(id)`, `purchaseOrderKeys.lists()`(승인이 발주를 만들 수 있음, 서버 계약 미확인), `purchaseStatsKeys.all` |
  | 구매 요청 반려             | `purchaseRequestKeys.lists()`, `.detail(id)`, `purchaseStatsKeys.all`                                                                            |
  | 구매 요청 생성             | `purchaseRequestKeys.lists()`, `purchaseStatsKeys.all`                                                                                           |
  | 공급사 등록                | `supplierKeys.lists()`                                                                                                                           |
  | 공급사 수정                | `supplierKeys.lists()`, `supplierKeys.detail(id)`                                                                                                |

  인사 무효화 매트릭스 (`HRM_MUTATION_EFFECTS`):

  | mutation        | 다시 가져오는 키                                                                          |
  | --------------- | ----------------------------------------------------------------------------------------- |
  | 휴가 승인, 반려 | `leaveKeys.lists()`, `attendanceKeys.lists()`(휴가가 근태에 반영된다고 가정)              |
  | 교육 수정       | `programKeys.lists()`, `.detail(id)`, `.dropdown()`                                       |
  | 교육 추가       | `programKeys.lists()`, `.dropdown()`                                                      |
  | 부서 수정       | `departmentKeys.lists()`                                                                  |
  | 출결 수정       | `attendanceKeys.lists()`                                                                  |
  | 교육 지정       | `trainingKeys.lists()`, `.detail(employeeId)`                                             |
  | 직원 등록       | `employeeKeys.lists()`, `hrmStatsKeys.all`, `departmentKeys.memberDropdown(departmentId)` |
  | 직원 수정       | `employeeKeys.lists()`, `departmentKeys.all`(옛 부서 id 를 몰라 부서 키 전부)             |
  | 급여 완료       | `payrollKeys.lists()`, `.detail(payrollId)`                                               |

  생산 무효화 매트릭스 (`PRODUCTION_MUTATION_EFFECTS`):

  | mutation                             | 다시 가져오는 키                                                                                                                               |
  | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
  | BOM 상태 변경                        | `bomKeys.detail(id)`, `bomKeys.lists()`                                                                                                        |
  | BOM 충돌 시뮬레이션(테스트 전용)     | 없음(옛 값을 유지해야 409 를 볼 수 있다)                                                                                                       |
  | BOM 생성                             | `bomKeys.lists()`, `productionStatsKeys.all`                                                                                                   |
  | 자재 구매 요청                       | `mrpPlannedOrderKeys.lists()` + 구매 `purchaseRequestKeys.lists()`, `purchaseStatsKeys.all` (구매 데이터를 만드는 요청이라 의도한 도메인 교차) |
  | 계획 주문 전환                       | `mrpOrderKeys.lists()`, `mrpPlannedOrderKeys.lists()`                                                                                          |
  | 제안납기 확정                        | `quotationKeys.lists()`                                                                                                                        |
  | MES 시작, 완료, 공정 시작, 공정 완료 | `mesKeys.detail(mesId)`, `mesKeys.lists()`, `productionStatsKeys.all`                                                                          |

  나머지 도메인 무효화 매트릭스 (`INVENTORY_`, `WAREHOUSE_`, `SALES_`, `FINANCE_`, `PROFILE_`, `NOTIFICATION_MUTATION_EFFECTS`).
  "(낙관적)" 표시가 있는 4곳은 공통 빌더의 `optimistic` 옵션으로 응답 전에 캐시를 고친다. `setQueriesData`(prefix match)라 목록의 모든 페이지에 닿고, 실패하면 스냅샷으로 되돌리며, 성공과 실패 모두 끝나면 위 키를 무효화한다. 생성(고객, 자재, 창고 등록)은 낙관적 업데이트를 하지 않는다(결정 7, `ai/decisions.md` 2026-11-10 "낙관적 업데이트 범위").

  | mutation                            | 다시 가져오는 키                                                                                  |
  | ----------------------------------- | ------------------------------------------------------------------------------------------------- |
  | 재고: 부족 재고 구매 요청           | `lowStockItemKeys.all` + 구매 `purchaseRequestKeys.lists()`, `purchaseStatsKeys.all`(의도한 교차) |
  | 영업: 견적 생성                     | `quoteKeys.lists()`, `salesStatsKeys.all`                                                         |
  | 영업: 검토 요청                     | `quoteKeys.lists()`, `.detail(id)`, `.reviewDetail(id)`, `salesStatsKeys.all`                     |
  | 영업: 즉시 납품                     | 위 4개 + `salesOrderKeys.lists()`                                                                 |
  | 재무: 전표 처리(ar, ap, supplierAp) | `invoiceKeys.lists(tab)`, `invoiceKeys.detail(id)`, `financeStatsKeys.all`                        |
  | 프로필: 휴가 신청                   | `profileKeys.attendanceRecords()` + 인사 `leaveKeys.lists()`(교차)                                |
  | 프로필: 출근, 퇴근                  | `profileKeys.todayAttendance()`, `.attendanceRecords()` + 인사 `attendanceKeys.lists()`(교차)     |
  | 프로필: 교육 신청                   | `profileKeys.trainings()` + 인사 `trainingKeys.lists()`(교차)                                     |
  | 알림: 전체 읽음, 하나 읽음          | `notificationKeys.lists()`                                                                        |

## 5-1. API 계약 (OpenAPI)

2026-11-10 OpenAPI 계약 1(창고), 2(나머지 도메인) 카드. 경로 129개, 요청 144개, 스키마 165개.

1. 원본은 `openapi/everp.yaml`(OpenAPI 3.1). 백엔드가 없어 프론트엔드가 쓴다. 성공 응답은 `ApiEnvelope` 에 `data` 를 더한 `allOf`, 실패는 `ApiError`.
2. 타입은 `pnpm openapi` 가 `src/lib/api/openapi.gen.ts` 로 만든다(openapi-typescript). 손으로 고치지 않는다. 도메인 타입 파일의 응답, 요청 선언 160개는 `Schema<'이름'>`, `QueryOf<'경로'>` 별칭(`src/lib/api/contract.ts`)이다. 쿼리 파라미터 타입과 화면 props 는 아직 손 타입이다.
3. 창고 목은 `openapi-msw` 로 계약에 묶었다(`src/mocks/handlers/warehouse.handlers.ts`, 틀린 필드는 `tsc` 가 막는다). 나머지 목은 그대로 두고 4번의 런타임 검사로 묶는다. 새로 쓰는 핸들러는 openapi-msw 로 쓴다.
4. `src/test/contract/openapi.contract.test.ts` 가 세 가지를 본다. api 파일이 쓰는 엔드포인트 상수가 전부 계약에 있는지, 계약의 GET 응답 전부가 MSW 응답과 맞는지(`z.fromJSONSchema`), 커밋된 생성 타입이 계약과 같은지(drift). CI 의 vitest 단계가 곧 계약 검사다.
5. 처음 옮길 때는 변환 스크립트를 썼다(`scripts/codemods/api-to-openapi.mts`, `types-to-aliases.mts`). 이제 계약이 원본이라 다시 돌리지 않는다. 영업, 구매, 생산 읽기의 zod 스키마(`*.schemas.ts`)는 손으로 쓴 것이지만 별칭 타입에 묶여 있어 계약과 어긋나면 `tsc` 가 막는다.

## 6. 폴더 규칙과 import 방향

```
src/
  app/(private)/<domain>/   page.tsx, <domain>.api.ts, <domain>.service.ts, <domain>.keys.ts, components/, types/
  app/(public)/             login, callback(옛 흔적, /login 으로 리다이렉트만), profile, unauthorized
  app/api/                  auth/*, proxy/[...path], [...slug](서버 목, MSW 핸들러를 서버에서 돌림)
  app/components/common/    앱 모델에 묶인 공통 UI(TableStatusBox, StatSection, 달력, 모달, 토스트 등). 나머지는 packages/ui
  lib/                      axios, auth, queryClient, role, status.constants
  mocks/                    MSW 핸들러 한 벌. 브라우저(워커), 단위 테스트(src/test/msw-server.ts), 서버 목이 같이 씀. 구체 경로를 :param 경로보다 앞에 정렬(src/mocks/handlers.ts)
  store/                    Zustand 2개(auth 캐시, 사이드바)
  test/                     vitest 보조(MSW 서버, server-only mock)
```

import 방향: `components/common`, `lib` ← `(private)/<domain>` ← `page.tsx`. 2026-11-10 부터 린트가 강제한다(`eslint-rules/index.mjs`, error).

1. `everp/domain-boundary`: 다른 도메인은 공개 입구 두 곳으로만 가져온다. `@/app/(private)/<도메인>`(index.ts: 키, api, 타입, 상수)과 `@/app/(private)/<도메인>/ui`(ui.ts: 화면 컴포넌트). 둘로 나눈 이유는 키만 쓰는 도메인이 모달과 그 의존까지 받지 않게 하려는 것이다(한 파일일 때 창고 첫 로드가 +21.7KB). 공통 코드(`src/lib`, `src/app/components` 등)는 도메인을 가져오지 않는다. 지금 공개 입구가 있는 도메인은 구매, 안전재고, 재고, 영업.
2. `everp/no-component-mutation`: `useMutation` 은 `*.mutations.ts` 와 `src/lib/query/` 에서만.
3. `everp/no-arbitrary-color`: className 의 임의 색(`bg-[#...]`) 금지. 3D 장면처럼 코드가 색을 정하면 상수를 style 로 넘긴다(`src/app/(private)/warehouse/components/warehouseVisualizer/stockColors.ts`).

타입 단언(`as`)과 non-null(`!`)은 0건이고 ESLint error 다(2026-11-10 타입 1차). 남긴 예외 1곳과 대신 쓰는 방식:

1. 모달 열기 `src/app/components/common/modal/ModalProvider.tsx:91`. `Omit<P, 'id' | 'onClose'>` 에 id 와 onClose 를 더하면 P 지만 제네릭 P 에서 TS 가 증명하지 못한다. 호출부 37곳의 리터럴 타입 추론을 지키려고 단언 한 줄을 남기고 이유를 적었다.
2. `Table<T>` 는 열 key 가 행 필드가 아닐 수 있어(`actions` 같은 가상 열) `keyof T` 로 묶지 않았다. 값은 `Reflect.get` 으로 꺼낸다 (`src/app/components/common/Table.tsx:65`).
3. 서버 응답을 믿는 자리는 타입 가드로 읽는다. 로그인과 세션 `readUserResponse`(`src/app/(public)/callback/userInfoType.ts`), FormData `formText`(`src/lib/formData.ts`). `ApiResponse` 판별 유니온과 zod 는 타입 2차 카드.

모달과 팝업 층(2026-11-10 접근성 2):

1. 모달 틀은 Radix Dialog(`src/app/components/common/modal/ModalContainer.tsx`). 포커스 가두기, Esc(맨 위 모달만), 닫힌 뒤 연 요소로 포커스 복귀, 뒤 화면 aria-hidden 을 맡긴다. 배경 클릭으로는 닫지 않는다. 틀은 `next/dynamic` 으로 첫 로드에서 빼고 화면이 한가할 때 미리 받는다(`ModalProvider.tsx:18`, `:51`).
2. Radix 모달은 열리면 body 에 `pointer-events: none` 을 건다. 그래서 드롭다운 목록, 달력 같은 팝업은 `FloatingPortal` 대신 `PopoverPortal`(`src/app/components/common/PopoverPortal.tsx`)로 붙인다. 모달 안이면 모달 틀 안에, 밖이면 body 에 붙는다. 새 팝업 컴포넌트도 이것을 쓴다.
3. 모달 안에 팝업이나 충돌 안내(`role="alertdialog"`)가 떠 있으면 모달은 Esc 를 넘긴다. 팝업은 스스로 Esc 를 받아 닫아야 한다(`src/app/hooks/useCloseOnEscape.ts`).
4. `Dropdown` 은 APG 의 select-only combobox(2026-11-10 접근성 3). 버튼이 combobox, 목록이 listbox, 포커스는 버튼에 남고 가리킨 항목은 `aria-activedescendant`. 키보드와 aria 는 floating-ui interaction 훅(`src/app/components/common/Dropdown.tsx:71`). Esc 는 `useDismiss` 가 받는다. Radix Select 를 안 쓴 이유는 `ai/decisions.md` 접근성 3 행.

## 7. 환경 변수

| 이름                                                  | 어디서   | 뜻                                                                                             |
| ----------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `SESSION_SECRET`                                      | 서버     | 세션 JWT 서명 키. 없으면 로그인과 검증 호출 때 throw. 빌드는 통과(`src/lib/auth/session.ts:9`) |
| `BACKEND_API_URL`                                     | 서버     | 업스트림. 없으면 `/api/[...slug]` 목                                                           |
| `NEXT_PUBLIC_API_BASE_URL`                            | 브라우저 | 기본 `/api/proxy`                                                                              |
| `NEXT_PUBLIC_API_MOCKING`                             | 브라우저 | `enabled` 면 MSW 워커 시작 (`src/app/providers.tsx:22`)                                        |
| `AUTH_PROVIDER`                                       | 서버     | `demo`(기본) 또는 `oidc`. 4절                                                                  |
| `NEXT_PUBLIC_AUTH_PROVIDER`                           | 브라우저 | `oidc` 면 로그인 화면이 IdP 버튼 하나                                                          |
| `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` | 서버     | OIDC 모드에서만. 없으면 로그인 시작 때 throw                                                   |

CI 는 빌드용 더미 `SESSION_SECRET` 을 넣는다 (`.github/workflows/ci.yml`). 배포 값은 Vercel 프로젝트 env. Production 과 Preview 환경 둘 다에 있어야 로그인이 된다. 2026-11-09 PR #1 머지 뒤 배포 7건이 Vercel 에 env 가 하나도 없어 `session.ts` import 시점 throw 로 실패했다. 같은 날 비밀키 읽기를 호출 시점으로 옮겨 빌드는 env 없이도 통과하게 했고, `vercel env add SESSION_SECRET production|preview` 로 환경마다 다른 값을 넣었다(`openssl rand -base64 32`). 교체는 `vercel env rm` 뒤 다시 add.

## 8. 도구와 검증

- Node 24 (`.nvmrc`, `package.json` engines). pnpm 10(`packageManager` 고정, 2026-11-10 모노레포 1 카드), CI 는 `pnpm install --frozen-lockfile`. 설치 스크립트는 `pnpm-workspace.yaml` 의 `onlyBuiltDependencies`(msw, unrs-resolver)만 돈다.
- 모노레포: 앱은 루트, 패키지는 `packages/*`. `@everp/eslint-plugin`(로컬 린트 규칙), `@everp/ui`(앱에 안 묶인 공통 컴포넌트 25개. TS 소스를 그대로 내보내고 Next 가 `transpilePackages` 로 변환, `sideEffects: false`). `pnpm verify` 가 Turborepo 로 lint, 타입 검사, 단위 테스트, 패키지 테스트를 돌리고 입력이 같으면 캐시에서 꺼낸다(`turbo.json`). CI 는 `.turbo/cache` 를 캐시한다. 앱을 `apps/erp` 로 옮기는 것은 Vercel Root Directory 설정(대시보드)을 바꿔야 해서 미뤘다.
- Storybook: `packages/ui/.storybook`(react-vite, a11y 애드온). `pnpm --filter @everp/ui storybook` 으로 띄운다. 스토리는 `packages/ui/src/*.stories.tsx`, `stories.test.tsx` 가 모든 스토리를 그리고 play 를 돌리고 axe(색 대비 제외) 위반 0 을 본다. `pnpm verify` 가 Storybook 빌드까지 한다.
- 디자인 토큰: `packages/ui/tokens.css` 가 원본(색 `@theme static`, z-index 변수와 `@utility z-modal` 등, 애니메이션). 앱 `src/styles/globals.css` 와 Storybook `preview.css` 가 가져온다. 층 순서는 local 10 < header 30 < sidebar 40 < overlay 50 < modal 1000 < toast 1100 < popover 9999.
- CI: PR 과 main push 에서 `pnpm verify`(lint, 타입, 단위 테스트, Storybook) → build → 번들 크기 비교(라우트당 +5KB) → e2e(next start) → Lighthouse(`perf/lighthouse.sh`: 로그인과 로그인 뒤 3화면, 데스크톱 1회, 접근성 0.9 미만이면 실패, 성능은 경고). 번들과 Lighthouse 표는 job summary 와 PR 코멘트 하나(다음 실행은 같은 코멘트를 고친다). Lighthouse 보고서는 밖으로 올리지 않고 artifact 로만. Vercel 은 GitHub 연동으로 main 머지 때 Production 배포, PR 마다 preview.
- 로컬 훅: commit-msg 는 commitlint(타입 `feat|fix|refac|test|chore|docs`), pre-commit 은 lint-staged.
- 테스트: vitest + Testing Library + MSW. 설정 `vitest.config.mts`, 공통 `vitest.setup.ts`(핸들러 없는 요청은 실패시킴). 서버 전용 모듈 테스트는 파일 첫 줄에 `// @vitest-environment node`.
- 린트: `eslint.config.mjs`. 타입 인식 규칙을 warn 으로 켜고 주석에 측정값을 적어 뒀다. 억제 파일 `eslint-suppressions.json` 은 린트 블록이 끝나면 삭제.

## 8-1. 성능 기준선 (2026-11-10)

측정: `pnpm build` 뒤 `pnpm perf`. 같은 맥에서 전후를 비교하는 용도다. 절대값으로 쓰지 않는다.

첫 로드 JS(정적 HTML 이 처음 받는 스크립트, gzip). `scripts/measure-bundle.mjs`:

| 라우트        | 청크 수 | 첫 로드 JS(gzip, KB) | 원본(KB) | 들어 있는 큰 패키지                                               |
| ------------- | ------: | -------------------: | -------: | ----------------------------------------------------------------- |
| /finance      |      18 |                574.3 |   2011.5 | framer-motion, recharts, MUI 날짜 선택기, MUI 기본, date-fns, zod |
| /sales        |      18 |                574.3 |   2011.3 | framer-motion, recharts, MUI 날짜 선택기, MUI 기본, date-fns, zod |
| /inventory    |      18 |                574.1 |   2010.9 | framer-motion, recharts, zod, MUI 날짜 선택기, MUI 기본, date-fns |
| /production   |      18 |                476.2 |   1623.2 | framer-motion, MUI 날짜 선택기, MUI 기본, date-fns, dnd-kit, zod  |
| /purchase     |      17 |                453.4 |   1554.1 | framer-motion, zod, MUI 날짜 선택기, MUI 기본, date-fns           |
| /low-stock    |      16 |                375.9 |   1276.2 | framer-motion, zod                                                |
| /hrm          |      16 |                369.9 |   1193.9 | framer-motion, MUI 날짜 선택기, MUI 기본, date-fns                |
| /dashboard    |      14 |                357.8 |   1228.2 | framer-motion, zod                                                |
| /warehouse    |      14 |                274.2 |    864.9 | framer-motion                                                     |
| /profile      |      12 |                269.9 |    851.0 | framer-motion                                                     |
| /alarm        |      13 |                263.9 |    824.8 | framer-motion                                                     |
| /login        |       9 |                176.5 |    570.3 |                                                                   |
| /unauthorized |       9 |                176.1 |    568.6 |                                                                   |
| /callback     |       9 |                172.6 |    559.7 |                                                                   |
| /             |       6 |                166.2 |    539.1 |                                                                   |

큰 청크 8개(gzip KB): 22-ktuortlg1u.js 121.6 [recharts] / 1gf7rp9x6rfrg.js 83.9 [zod] / 0twzgvo4haiq_.js 70.9 [MUI 날짜 선택기 MUI 기본 date-fns] / 2kys1w8x9rmsc.js 70.5 [framer-motion] / 0yslia1k6p-7o.js 70.0 [] / 1vgpv7vwitdbl.js 42.0 [] / 0cz1d0mv5g_q7.js 38.7 [] / 0lgwh2v-nrier.js 31.0 [dnd-kit]

화면 3개, 운영 빌드, CPU 4배 느리게, 3번 중앙값. `perf/measure.spec.ts`:

| 화면       | LCP(ms) | 긴 작업 합(ms) | 스크립트 전송(KB) | 첫 진입 API | 다른 탭으로 API | 첫 탭으로 돌아올 때 API |
| ---------- | ------: | -------------: | ----------------: | ----------: | --------------: | ----------------------: |
| /purchase  |      72 |             31 |               634 |           5 |               4 |                       0 |
| /sales     |      72 |             58 |               634 |           2 |               1 |                       0 |
| /inventory |     360 |            130 |               658 |           5 |               2 |                       0 |

변화 기록(같은 맥, 같은 측정):

| 카드                | 바꾼 것                                                | 첫 로드 JS(gzip KB)                                                                             | 화면(CPU 4배)                                                                  |
| ------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 성능 2 (2026-11-10) | MUI, emotion, date-fns 제거, 자체 달력                 | 재무, 영업, 재고 574.3 → 503.7, 생산 476.2 → 404.8, 구매 453.4 → 382.2, 인사 369.9 → 298.4      | 스크립트 전송 634 → 586(구매, 영업), 658 → 609(재고). 재고 긴 작업 130 → 109ms |
| 성능 3 (2026-11-10) | 탭 표를 도메인별 파일로, 매출 분석 탭만 dynamic import | 재무 503.7 → 286.3, 영업 503.6 → 382.9, 재고 503.5 → 381.7                                      | 스크립트 전송 586 → 480(구매, 영업), 609 → 505(재고). 재고 긴 작업 109 → 76ms  |
| 성능 4 (2026-11-10) | framer-motion 을 CSS 애니메이션으로                    | 비공개 화면 전부 약 44.6 줄어듦(구매 382.0 → 337.3, 재무 286.3 → 241.7, 대시보드 355.4 → 310.8) | 스크립트 전송 480 → 435(구매, 영업), 505 → 460(재고)                           |
| 성능 5 (2026-11-10) | 화면용 zod 를 `zod/mini` 로                            | zod 를 쓰는 화면 약 69.6 줄어듦(구매 337.3 → 267.7, 대시보드 310.8 → 241.2, 생산 360.3 → 290.7) | 스크립트 전송 435 → 366(구매, 영업), 460 → 391(재고). 재고 긴 작업 79 → 59ms   |

날짜 규칙: 화면의 날짜는 현지 자정 `Date` 와 현지 `YYYY-MM-DD`(`toDateKey`, `parseDateKey`, `src/app/utils/date.ts`)로만 오간다. `toISOString()` 과 `new Date('YYYY-MM-DD')` 는 UTC 라 한국 시간에서 하루가 밀린다(성능 2 카드에서 찾은 결함).

읽는 법:

1. 재무, 영업, 재고 화면은 첫 로드에 recharts(121.6KB)를 받았다. 공용 탭 표(`componentConstant.ts`)가 모든 도메인의 탭을 import 해서다. 성능 3 카드에서 도메인별 탭 파일로 나누고 매출 분석 탭만 열 때 받게 했다.
2. MUI 날짜 선택기와 date-fns 묶음(70.9KB)은 `CalendarButton` 한 곳 때문이었다. 성능 2 카드에서 자체 달력으로 바꿔 뺐다.
3. zod(83.9KB)는 타입 2차 카드에서 들어왔다. 성능 5 카드에서 화면용 스키마를 `zod/mini`(함수형 API)로 바꿨다. 서버(OIDC)는 번들과 상관없어 `zod` 그대로.
4. framer-motion(70.5KB)은 토스트와 모달 틀 때문에 모든 화면이 받았다. 성능 4 카드에서 CSS 키프레임 4개(`src/styles/globals.css`)로 바꿔 뺐다.
5. 탭을 다시 열 때 API 0 은 TanStack Query 캐시(staleTime 30초)가 일한다는 뜻이다.

## 8-2. 옵저버빌리티 (2026-11-10)

1. 요청 ID: 프록시가 요청마다 `x-request-id` 를 정해 업스트림과 응답에 싣는다(`src/app/api/proxy/[...path]/route.ts`, 들어온 값은 영숫자와 `-` 8~64자일 때만). `AppError.requestId` 가 받고 `TableStatusBox`, `StatSection` 이 "요청 ID" 앞 8자를 보인다. 5xx 와 연결 실패는 서버 로그에 JSON 한 줄(`evt: proxy`). 연결 실패는 502.
2. Error Boundary 3층: `src/app/global-error.tsx`(루트 레이아웃까지 깨질 때), `src/app/(private)/error.tsx`(헤더와 메뉴는 남고 본문만), 모달(`ModalContainer` 안 `ErrorBoundary`, 그 모달만 오류로 바뀌고 닫을 수 있다). `src/app/error.tsx` 는 (private) 밖. 운영에서는 stack 대신 digest. 경계는 Next 16 의 `retry()` 를 쓴다.
3. web-vitals: `WebVitalsLazy`(첫 로드에서 뺌)가 `/api/vitals` 로 sendBeacon. 서버는 모양과 크기(2KB)를 보고 로그 한 줄(`evt: web-vital`).
4. Sentry 와 Vercel Speed Insights 는 계정과 대시보드 설정이 필요해 붙이지 않았다. 붙일 자리는 `global-error.tsx`, `ErrorBoundary.componentDidCatch`, `/api/vitals`.

## 9. 안 하기로 한 것 (SKIP)

| 항목                                   | 이유                                                                                                                                                                | 기록                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 모바일 대응                            | 데스크톱 ERP 운영자. 최소 뷰포트 1280px                                                                                                                             | `ai/decisions.md` 2026-11-09                           |
| 전면 FSD                               | 도메인 9개, 개발자 1명. 규칙 2개만 린트로                                                                                                                           | 같은 날                                                |
| Zero-runtime CSS 추가                  | Tailwind v4 가 이미 빌드 타임                                                                                                                                       | 같은 날                                                |
| Jotai                                  | 전역 상태 2개                                                                                                                                                       | 같은 날                                                |
| Next Cache Components, PPR             | 인증 뒤 동적 화면이라 적용 면이 거의 없음                                                                                                                           | 계획 문서 18절                                         |
| 가상화                                 | 페이지 크기 10                                                                                                                                                      | 같은 날                                                |
| 레이아웃 서버 컴포넌트 전환            | 사이드바, 가드, 화면 폭이 클라이언트라 레이아웃만 서버로 돌려도 첫 로드 JS 가 거의 같다. 페이지 본문도 전부 클라이언트(`XClient`)                                   | 성능 블록 마무리 2026-11-10                            |
| 목록 서버 prefetch + HydrationBoundary | 데이터가 사용자 세션에 묶여 있어 정적 렌더(○)가 매 요청 동적 렌더로 바뀐다. 측정상 LCP 72~272ms(CPU 4배)라 얻을 것이 작다                                           | 같은 날                                                |
| 행 hover prefetch                      | 상세는 모달이 로딩 상태로 열리고 같은 키는 30초 캐시. hover 마다 요청이 늘어난다                                                                                    | 같은 날                                                |
| React Compiler                         | 켜고 재 보니 첫 로드 JS 가 라우트마다 +8~22KB, 조작 중 JS 는 -6ms(8%), 커밋 -1. 목록이 페이지당 10행이라 리렌더 비용이 원래 작다. 재는 법은 `perf/compiler.spec.ts` | `ai/cards/2026-11-10_React_Compiler.md`                |
| 리렌더 Profiler 작업                   | 화면 긴 작업 합이 4~59ms(CPU 4배). 고칠 만큼 큰 리렌더가 숫자로 안 보인다                                                                                           | 같은 날                                                |
| Grafana, Kibana, Terraform             | 서버가 없고 Vercel 유지                                                                                                                                             | 같은 날                                                |
| MES 간트를 생산 라인별로 묶기          | MES 응답에 생산 라인 필드가 없다. 서버 계약에 라인이 생기면 다시 본다                                                                                               | `ai/cards/2026-11-10_시각화_3_MES_간트.md`             |
| BOM 트리 접기 상태를 URL 에            | BOM 트리는 모달 안이고 모달이 URL 에 없어 새로고침하면 닫힌다                                                                                                       | `ai/cards/2026-11-10_시각화_7_BOM_원가_롤업.md` 결정 2 |

## 10. 확인하지 않은 것 (verified=false)

문서나 가정만 보고 쓴 것. 실제로 돌려 본 뒤 지운다.

| 항목                                                                                                         | 근거                                                                                                                                     | 확인 방법                             |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 실 서버가 `version` 필드와 409 를 돌려준다                                                                   | 팀 기간 BOM 구현의 기억                                                                                                                  | 서버 생기면 발주 수정으로 확인        |
| 날짜는 UTC ISO 8601 로 온다                                                                                  | 가정                                                                                                                                     | OpenAPI 계약에 명시 뒤 서버와 대조    |
| Vercel 배포본에서 `proxy.ts` 가 Node 런타임으로 돈다                                                         | Next 16 문서                                                                                                                             | 배포 뒤 함수 로그                     |
| 모달 틀 청크를 받기 전(idle 전)에 모달을 열면 오버레이만 잠깐 보이고 곧 뜬다. 청크 로드가 실패하면 처리 없음 | 접근성 2, 코드만 봄                                                                                                                      | 느린 3G 로 첫 화면에서 바로 모달 열기 |
| 실제 스크린리더(VoiceOver, NVDA)가 모달과 드롭다운을 의도대로 읽는다                                         | axe 와 aria 속성만 확인                                                                                                                  | VoiceOver 로 창고 수정, 구매 필터     |
| 드롭다운 글자 입력 이동이 한글에선 안 된다(IME 조합 중 key 가 `Process`)                                     | 접근성 3, floating-ui 코드                                                                                                               | 한글 입력기로 필터에서 글자 입력      |
| 서버가 통계의 `trend`(기간 추이)를 준다                                                                      | 2026-11-10 시각화 1. 계약과 목만                                                                                                         | 서버 생기면 통계 API 응답             |
| 서버가 품목 재고 추이(`/items/{itemId}/stock-history`)를 준다                                                | 2026-11-10 시각화 2. 계약과 목만                                                                                                         | 서버 생기면 재고 상세                 |
| 재무 현황의 월별 손익과 미수금 경과를 서버가 준다                                                            | 2026-11-10 시각화 4. 계약과 목만 있고 서버 지원은 확인 전(verified=false). 인가는 BFF 표에서 사내 재무 역할로 막는다                     | 서버가 두 경로를 열면                 |
| 날짜별 근태 집계를 서버가 준다                                                                               | 2026-11-10 시각화 5. 계약과 목만 있고 서버 지원은 확인 전(verified=false)                                                                | 서버가 경로를 열면                    |
| 이번 달 자재 흐름(금액 그래프)을 서버가 준다                                                                 | 2026-11-10 시각화 6. 계약과 목만 있고 서버 지원은 확인 전(verified=false). 인가는 BFF 표에서 운영 역할로 막는다                          | 서버가 경로를 열면                    |
| BOM 자재 단가를 서버가 준다                                                                                  | 2026-11-10 시각화 7. 계약 `BomLevelStructureNode.unitCost` 와 목만 있고 서버 지원은 확인 전(verified=false). 상위 원가는 화면이 계산한다 | 서버가 필드를 주면                    |
| 서버 재고 목록이 `type=WAREHOUSE_NAME` 으로 창고 이름을 걸러 준다                                            | 2026-11-10 시각화 8. 화면의 검색 옵션(창고명)과 목만 봄                                                                                  | 서버 생기면 창고 3D                   |

### 10-1. 확인해서 지운 것

| 항목                                                | 확인한 날  | 어떻게                                                                                                                                                                                                                    |
| --------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel 함수에서 서버 목(msw getResponse)이 응답한다 | 2026-11-10 | 운영(4ever-fe.vercel.app)에 데모 관리자로 로그인해 `/api/proxy/scm-pp/iv/warehouses` 200, `x-request-id` 있음. 새 경로 `dashboard/supply-flow`, `business/fcm/analytics/monthly` 도 200, 대시보드에 자재 흐름 카드가 뜬다 |
| Vercel 이 pnpm 10 으로 설치, 빌드한다               | 2026-11-10 | 운영 배포 로그: "Detected pnpm-lock.yaml version 9 generated by pnpm@10.x", "Done in 2.4s using pnpm v10.34.8"                                                                                                            |
| Keycloak 25 가 Java 17 에서 뜬다                    | 2026-11-10 | 대신 Keycloak 26.8.1 + Java 21 로 띄워 OIDC e2e 5개 통과(인증 4단계). 25 와 17 조합은 쓰지 않는다                                                                                                                         |
