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
                                  └─ 없음 → src/app/api/[...slug]/route.ts (서버 목. 프록시가 서명한 증명이 있는 호출만 받는다)
                                             └─▶ src/server/serverMock.ts (MSW 핸들러 어댑터)
개발 시 NEXT_PUBLIC_API_MOCKING=enabled → MSW 서비스 워커가 브라우저에서 먼저 가로챔 (src/mocks/)
```

## 2. 요청 한 번의 경로

목록 화면이 데이터를 받기까지.

1. 도메인 `*.api.ts` 가 `*_ENDPOINTS` 상수로 URL 을 만든다. 기본 base 는 `/api/proxy` 다 (`src/app/types/api.ts:4`). 응답 래퍼는 `ApiResponse<T>` (`src/app/types/api.ts:14`).
2. 전역 axios 는 타임아웃 4초 (`src/lib/axiosInstance.ts:4`). 응답 인터셉터 하나가 두 가지를 한다. 2xx 인데 래퍼가 깨진 응답(`success === false`, GET 인데 `data` 없음)을 `invalidShape` 로 올리고 (`:21`), 실패는 전부 `AppError` 로 정규화해 reject 한다 (`:48`, 종류 9개는 `src/lib/AppError.ts:8`). 실패를 URL 별 빈 데이터로 바꿔치기하던 fallback 은 2026-11-09 에 지웠다(카드 `ai/cards/2026-11-09_오류를_빈_데이터로_숨기는_fallback_제거.md`). AppError 는 종류와 진단용 원문(`message`)을 보존하고 번역이나 React 훅을 쓰지 않는다. 화면과 토스트는 `useErrorMessage` (`src/i18n/useErrorMessage.ts:7`)로 공통 메시지의 `errors` 에서 종류별 안내만 번역해 표시한다. 서버 메시지는 화면에 덧붙이지 않는다. `TableStatusBox` 와 `StatSection` 은 `error` prop 으로 이 한 줄을 보인다 (`src/app/components/common/TableStatusBox.tsx:32`, `StatSection.tsx:48`).
3. `/api/proxy/[...path]` 가 받는다. 상태 변경 요청은 same-origin 검사 (`src/app/api/proxy/[...path]/route.ts:66`), 세션 쿠키 검증 (`:72`), 업스트림 base 결정 (`:54`, `:79`), 경로 정규화 뒤 도메인별 role 검사 (`:98`, 규칙표와 인사 셀프서비스 예외는 `src/lib/authz/policy.ts`), 쿠키를 떼고 `Authorization: Bearer` 를 붙여 fetch. 역할 헤더 `x-session-role` 은 세션 값으로 늘 덮어쓴다(`:116`).
4. 업스트림이 없으면 `src/app/api/[...slug]/route.ts` 가 목 데이터를 돌려준다. 응답은 단위 테스트와 같은 MSW 핸들러가 만든다 (`src/server/serverMock.ts:24` `getResponse`, 2026-11-10 목 한 벌 카드). 예전 손으로 쓴 서버 목 1,902줄은 지웠다.
   서버 목 라우트는 프록시가 넘긴 호출만 받는다(2026-11-12 남은 표시 결함 3 리뷰). 이 라우트는 페이지 프록시 matcher(api 제외)와 API 인가 표(`/api/proxy/*` 에만) 밖이라, 프록시가 업스트림이 서버 목일 때만 SESSION_SECRET 으로 서명한 30초짜리 증명 `x-mock-proof` 를 붙이고(`src/server/auth/mockProof.ts:14`, 프록시 `:122`. 브라우저가 넣은 값은 지운다. 실백엔드로는 안 보낸다) 라우트가 검증한다(`src/app/api/[...slug]/route.ts:15`). 증명이 없거나 틀리면 401. 역할은 요청 헤더가 아니라 증명에서 읽어 `x-session-role` 을 다시 쓴다. 증명에는 용도 값(`use`)이 있어 같은 비밀키로 서명한 세션 JWT 를 내밀어도 통과하지 못한다. 그래서 `/api/<경로>` 직접 호출은 로그인해도 401 이다(`/api/me` 같은 `USER_ENDPOINTS` 포함. 화면은 부르지 않는다).
   목은 쓰기 결과를 기억한다(2026-11-12 목이 쓰기 결과를 따르게 카드). 승인, 반려, 수정, 생성 핸들러가 `src/mocks/state.ts` 의 저장소에 적고 목록과 상세 핸들러가 읽는다. 도메인 핸들러 파일이 `mockState(처음 상태)` 로 자기 상태를 선언한다(`src/mocks/state.ts:34`, 예: `src/mocks/handlers/purchase.handlers.ts:59`).
   - 로그인별이다. 서버 목에는 프록시가 붙인 `Authorization: Bearer <세션 토큰>` 이 오고, 서버 목 어댑터(`src/server/serverMock.ts`)가 그 값을 SHA-256 해시로 바꿔 핸들러에 넘긴다. 그 해시가 키다(토큰 원문은 저장소에 남지 않는다. 알림 목의 키도 같다). 한 방문자가 전부 승인해도 다음 방문자는 처음 상태를 본다. 브라우저 MSW 와 단위 테스트에는 그 헤더가 없어 저장소 하나를 같이 쓴다. 단위 테스트는 `vitest.setup.ts` 의 `afterEach` 가 `resetMockState()` 로 비운다.
   - 메모리 Map 이다. 서버리스 인스턴스가 바뀌거나 다시 배포되면 처음 상태로 돌아가고, 인스턴스가 여럿이면 요청마다 다르게 보일 수 있다. 로그인은 최근에 쓴 200개만 기억한다(`MAX_MOCK_SESSIONS`). 한 로그인이 만든 행은 목록마다 50개까지만 남는다(`MAX_CREATED_ROWS`, 생성 핸들러는 `addCreated` 만 쓴다). 데모 세션 JWT 는 계정, 역할, 발급 시각(초)으로 만들어져 같은 계정이 같은 초에 로그인하면 상태를 같이 본다.
   - 통계 카드와 대시보드 숫자는 고정 값이라 쓰기를 따르지 않는다. 이미 처리된 건에 같은 쓰기를 또 보내도 성공으로 답한다(실서버 동작 미확인). 값을 망가뜨리는 두 번째 쓰기(같은 교육 지정, 끝난 공정이나 MES 에 시작)는 값을 그대로 둔다. 프로필 목(`auth.handlers.ts`)은 아직 결과를 기억하지 않고, 알림 목(`alarm.handlers.ts`)은 자기 저장소를 따로 쓴다.
   - 상세는 목록의 그 행에서 만든다(2026-11-12 목 데이터 현실성 카드). 도메인마다 목록과 상세가 같은 함수(예: MES `src/mocks/handlers/production.handlers.ts:415` `mesRow`)를 읽는다. 목록과 짝인 상세 19개는 그 로그인의 지금 목록에 없는 id(다른 로그인이 만든 행, 50건 상한으로 밀려난 행 포함)에 404 와 `{ status, success: false, message }` 를 준다(2026-11-13 없는 건은 404 카드, 공통 `notFound` `src/mocks/utils.ts:148`, 짝 표 `src/test/contract/detailPairs.ts`). 품목의 번호, 단가, 처음 재고는 `src/mocks/handlers/catalog.ts` 하나다. 마스터(직원, 고객, 공급사, 창고)와 영업 견적, 영업 주문은 `src/mocks/handlers/seed.ts` 하나이고 도메인을 넘어 같은 id 와 이름을 쓴다(구매 요청의 요청자 = 직원, 생산 견적 = 영업 견적, MRP 품목 = 품목표, 2026-11-13 데모 데이터 채우기 카드. MES 제품 = 그 견적의 첫 품목, 목 필터와 검색 카드). 목록은 쓰기 결과를 덮은 뒤 화면이 보낸 필터와 검색을 `filterBy`(`src/mocks/utils.ts:110`, 도메인마다 규칙 표. 상태 같은 값, 날짜 범위, 검색 타입별 칸에서 부분 일치와 대소문자 무시, `ALL` 과 빈 값은 무시, 2026-11-13 목 필터와 검색 카드)로 거른 뒤 `paged`(`src/mocks/utils.ts:82`)로 요청의 쪽을 자르고(총 건수는 거른 수), 거래 목록(견적, 주문, 구매 요청, 발주)은 날짜 최신순, 마스터 목록은 번호순이다. 통계 띠는 `statResponse`(`src/mocks/utils.ts:56`)로 만들고, 추이 마지막 점이 값이며 첫 점 대비 증감이 `delta_rate` 다. 건수의 주 값은 목록 총 건수(`flow`, `:24`)다. 영업의 신규 주문과 매출만 이번 주(월요일~오늘) 주문에서 세어 매출 분석의 마지막 점과 같다. 영업 주문은 손으로 적지 않고 오늘이 든 주에서 53주 앞부터 오늘까지 주마다 만든다(`seedOrders`, `src/mocks/handlers/seed.ts:419`). "오늘"은 한국 날짜(화면이 브라우저 날짜로 기간을 보낸다)이고 주마다 첫 주문은 월요일이라 이번 주 신규 주문이 0 이 되지 않는다. 주문 번호는 2025-11-03 주부터 이어 세어 창이 옮겨 가도 같은 주문은 같은 id 다. 재무 월별 손익의 매출은 그 주문의 월 합이고 매입, 순이익은 매출에서 계산해(`financeMonthlyPoints`, `src/mocks/handlers/financeAnalytics.handlers.ts:19`) 재무, 대시보드, 영업, 구매 금액이 같다. 매출 분석은 요청 기간의 주마다 한 점이고 값은 같은 주문 목록에서 센다(`src/mocks/handlers/sales.handlers.ts:259`). 견적 재고 확인은 요청 품목과 수량을 품목표 재고(재고 이동 반영)와 견준다. 재고 목록, 안전재고 부족, 생산중, 출고 준비, 입고 대기, 입고 완료, MPS 도 손으로 적지 않고 품목표, 영업 주문, 발주, 확인된 생산 견적에서 거른다(`src/mocks/handlers/inventory.handlers.ts`, MPS 는 `production.handlers.ts` `mpsWeeks`). 현재고, 안전재고, 재고 상태는 `src/mocks/handlers/stock.ts` 의 `stockOf` 하나라 재고, 견적 재고 확인, MRP 가 같은 값이고, 배송 시작은 영업 주문 상태를, 발주 배송 시작은 입고 대기를 바꾼다(2026-11-13 데모 목록 재고 물류 카드).
5. 화면은 TanStack Query 로 받는다. 키는 도메인별 팩토리 (`src/app/(private)/purchase/api/purchase.keys.ts:6` 가 표준 모양: all → lists → list(params), details → detail(id)). 리터럴 키는 0건.

## 3. 인증과 인가 (지금)

- 로그인은 데모 계정 선택이다. 계정은 아홉이다(`DEMO_ACCOUNTS`, `src/lib/auth/simpleLogin.ts:30`: admin, mm_admin, sd_admin, fcm_admin, hrm_admin, im_admin, pp_admin, customer, supplier). 아이디 판정은 `findDemoAccount` 하나다(`:118`, 대소문자와 앞뒤 공백을 가리지 않는다). 로그인 화면(`src/app/(public)/login/page.tsx:91`)과 `/api/auth/login`(`src/app/api/auth/login/route.ts:46`)이 같이 쓰고, 통과하면 세션을 연다 (`:58`). 세션 처리는 한 모듈이다 (`src/server/auth/session/index.ts:21`). 데모 저장소는 HS256 으로 서명한 JWT 를 httpOnly 쿠키 `session`(운영은 `__Host-session`, 서브도메인의 쿠키 바꿔치기 방지)에 심는다 (서명 `src/lib/auth/session.ts:40`, 검증 `:50`, 만료 1일 `:45`). OIDC 카드에서 sid 쿠키 + 서버 저장소 구현이 같은 경계(`SessionStore`)에 붙는다.
- 페이지 접근은 `src/proxy.ts` 가 막는다. 세션 확인 (`src/proxy.ts:12`) 뒤 역할 표로 판정 (`:24`). matcher 는 공개 경로만 빼는 denylist (`:34`). Next 16 부터 파일 이름이 `middleware.ts` 에서 `proxy.ts` 로 바뀌었고 Node 런타임이 기본이다.
- 권한 규칙은 표 하나다 (`src/lib/authz/policy.ts:72`). 페이지 프록시, API 프록시, 메뉴 2곳이 같이 읽는다. 역할은 `Role` 유니온 15개이고 목록 밖 역할이 든 세션은 무효다.
- 클라이언트 가드는 매 진입마다 `/api/auth/me` 로 확인하고 (`src/app/(private)/_PrivateGuard.tsx:20`, 사용자 타입은 `src/lib/auth/userInfo.ts`) 결과를 `authStore` 에 캐시한다. 이 스토어는 localStorage 에 persist 된다 (`src/store/authStore.ts:12`). 표시용 캐시일 뿐 권한 판단에 쓰지 않는다.
- 구매 요청 부서는 인증 사용자의 `/business/profile` 을 기존 프로필 API와 쿼리 키로 조회한다 (`src/app/(private)/purchase/components/modals/PurchaseRequestFormModal.tsx:54`). 열 때 다시 확인하고 조회 중, 실패, 부서 없음은 입력을 유지하며 제출을 막는다. 프로필은 게이트웨이의 원형 중계라 `department` 와 `departmentName` 문자열을 허용한다 (`:28`). 생성 본문은 `items` 만 보내고 요청자 ID는 게이트웨이가 인증 principal에서 결정한다 (`openapi/everp.yaml:6835`, 팀 백엔드 `MmController.createPurchaseRequisition` 기준).
- 프록시는 세션 JWT 자체를 Bearer 로 보낸다. 실 IdP 토큰이 없어서다. 실 서버가 생기면 반드시 바뀐다 (4절).
- 공격 점검(BFF 문서 Phase 5)은 테스트로 고정했다: 같은 출처 판정 `src/lib/auth/sameOrigin.test.ts`, 프록시 우회와 401, 403, 지어낸 역할과 증명 헤더 덮어쓰기 `src/app/api/proxy/[...path]/route.test.ts`, 서버 목 직접 호출과 증명 위조 401 `src/app/api/[...slug]/route.test.ts`, alg none `src/lib/auth/session.test.ts`, 오픈 리다이렉트 `src/lib/auth/returnTo.test.ts`, 콜백 재사용과 state 위조 `src/server/auth/oidcLogin.test.ts`.
- 알림 SSE 도 같은 프록시 주소로 붙어 세션 쿠키로 인증된다. 브라우저는 Authorization 헤더를 보내지 않는다 (`src/app/components/header/Notification/useNotificationSSE.ts:41`). 옛 SPA 시절 토큰 파일은 2026-11-10 지웠고 PKCE 도구만 서버 쪽으로 옮겼다(지금은 `packages/auth/src/pkce.ts`).

## 4. 인증과 인가: OIDC 모드

`AUTH_PROVIDER=oidc` 면 BFF 가 OIDC confidential client 가 된다(2026-11-10 인증 4단계). 기본값 `demo` 는 3절 그대로라 Vercel 데모는 바뀌지 않는다. 세부 배경은 옵시디언 `프론트엔드/4ever-erp_아키텍처와_루프_계획_2026-11-09.md` 8절과 `4ever-erp_BFF_인증_진단과_실습계획.md` Part D.

```
packages/auth/ (@everp/auth, erp 와 포털이 같이 쓴다. 2026-11-10 SSO 포털 카드에서 옮김)
  src/idp/          IdentityProvider 인터페이스, oidc.ts(discovery, PKCE, JWKS 로 ID 토큰과 로그아웃 토큰 검증)
  src/session/      SessionStore<역할> 경계, memoryStore(sid + 서버 Map, 레지스트리 이름을 앱마다), refresh.ts(single-flight)
  src/pkce.ts       code_verifier, S256 challenge
  src/shortLived.ts 로그인 트랜잭션 쿠키 서명(비밀키는 앱이 넘긴다)
  src/next.ts       로그인 흐름 createOidcLoginFlow: 시작(state, nonce, verifier 를 10분 서명 쿠키에) / 콜백(state, nonce 확인)
  src/testing.ts    가짜 IdP(MSW 서버를 넘겨받는다)
src/server/auth/    erp 어댑터
  config.ts         AUTH_PROVIDER 와 OIDC env. IdP 는 쓰는 시점에 만든다
  session/          역할을 Role 로 좁힌 타입, cookieStore(데모, 서명 JWT), memoryStore 인스턴스, 쿠키 이름과 속성(index.ts)
  oidcLogin.ts      역할 고르기(pickRole)와 로그인 흐름 조립
src/lib/authz/policy.ts   역할 표(3절)
src/app/api/auth/   login(GET 302, POST 데모), callback, me, logout(IdP 로그아웃 주소 반환), backchannel-logout
```

흐름:

1. `/login` 은 버튼 하나다. `/api/auth/login?returnTo=` 가 IdP 로 302 한다. state, nonce, PKCE verifier, returnTo 는 서명한 10분짜리 httpOnly 쿠키(`oidc_tx`, path `/api/auth`)에 있다.
2. 콜백(`packages/auth/src/next.ts` 의 `finish`)이 state 를 비교하고 code 를 토큰으로 바꾼 뒤 ID 토큰을 JWKS 로 검증하고 nonce 를 비교한다. `realm_access.roles` 중 역할 표에 있는 첫 역할로 세션을 연다. 없으면 `/login?error=no_role`.
3. 쿠키에는 추측할 수 없는 sid(43자)만 있다. 토큰은 서버 메모리에 있다. API 프록시가 업스트림에 IdP access token 을 Bearer 로 붙인다.
4. access token 이 30초 안에 만료되면 API 프록시가 갱신한다 (`src/server/auth/session/index.ts:35`). 같은 sid 의 동시 요청은 갱신 하나를 같이 기다린다 (`packages/auth/src/session/refresh.ts`). Keycloak 의 refresh token rotation 때문에 두 번 부르면 두 번째가 실패해 세션이 끊긴다. 갱신이 실패하면 세션을 지우고 401.
5. 로그아웃은 앱 세션을 지우고 IdP 로그아웃 주소(id_token_hint)를 돌려준다. 브라우저가 그 주소로 가야 IdP 세션도 끝나 SSO 로 바로 다시 들어오지 않는다.
6. IdP 에서 세션이 끊기면(관리자 강제 로그아웃 등) IdP 가 `/api/auth/backchannel-logout` 에 서명한 logout_token 을 보낸다. 그 사용자의 앱 세션을 지워 다음 요청이 401 이 된다.

한계: 메모리 저장소는 인스턴스 하나에서만 맞다(결정 9). Vercel 처럼 인스턴스가 여럿이면 외부 저장소(Redis 등)가 필요하다. 그래서 Vercel 은 데모 모드다. 페이지 프록시용 15분 role 클레임 쿠키도 그때 넣는다.

로컬에서 돌리기: `bash dev/keycloak/start.sh`(Keycloak 26.8.1, 포트 8180, realm 은 `dev/keycloak/everp-realm.json` 을 가져온다) 뒤 `pnpm dev:oidc`(앱 3100 포트. Keycloak 클라이언트의 콜백과 백채널 주소가 3100 하나다) 또는 `pnpm e2e:oidc`. 값은 `dev/keycloak/.env.keycloak`, `.env.oidc`(git 에 안 올림, 변수 목록은 `start.sh` 머리말). 확인 항목 5개(`e2e-oidc/oidc.spec.ts`): 로그인과 sid 쿠키, 역할 차단, 60초 토큰 두 번 갱신 중 동시 요청 5개, RP 로그아웃 뒤 Keycloak 로그인 화면, 백채널 로그아웃 뒤 401. Keycloak 이 없는 CI 는 돌리지 않는다.

### 4-1. SSO 포털(apps/portal, 2026-11-10)

`apps/portal` 은 공급사와 고객사용 얇은 Next 앱(포트 3300, 로컬 전용, 배포 안 함)이다. erp 와 같은 Keycloak realm 의 두 번째 클라이언트(`everp-portal`)이고, 인증 코드는 같은 `@everp/auth` 를 쓴다.

- SSO: erp 에 로그인한 브라우저가 포털에 오면 Keycloak 이 로그인 폼 없이 code 를 돌려준다(같은 IdP 세션).
- 로그아웃: 어느 쪽에서 로그아웃해도 RP 시작 로그아웃으로 Keycloak 세션이 끝나고, Keycloak 이 다른 쪽 `/api/auth/backchannel-logout` 에 알려 그쪽 세션도 지운다.
- 쿠키는 포트로 나뉘지 않는다. 같은 localhost 에서 겹치지 않게 포털은 `portal_session`, `portal_oidc_tx` 를 쓴다(`createOidcLoginFlow` 의 `txCookie`).
- 역할: ALL_ADMIN, SUPPLIER_ADMIN, CUSTOMER_ADMIN 만. 그 밖은 `/signed-out?error=no_role`. 화면 데이터는 고정 값(verified=false).
- 포털에 `src/proxy.ts`(지나가기만 함)가 있는 이유: 없으면 Next 16.3.4 Turbopack 이 저장소 루트(erp)의 `src/proxy.ts` 를 집어 빌드가 깨진다.
- 돌리기: `bash dev/keycloak/start.sh`, 클라이언트를 더했으면 `node dev/keycloak/sync-clients.mjs`(이미 있는 realm 에 반영), `pnpm --filter @everp/portal dev` 또는 `pnpm e2e:oidc`(erp 와 포털을 같이 띄운다, `e2e-oidc/sso.spec.ts` 5개, 포털 세 화면 axe 위반 0 포함). 값은 `dev/keycloak/.env.portal`(git 에 안 올림).

## 5. 서버 상태 레이어

- QueryClient 는 한 팩토리 `createQueryClient` 에서 나온다 (`src/lib/queryClient.ts`). 서버 컴포넌트용 `cache()` 래퍼 `getQueryClient` (retry 0) 와 클라이언트 Provider (`src/app/providers.tsx`). 기본값은 staleTime 30초, gcTime 5분, 포커스 refetch 켬, retry 는 `AppError.kind` 가 network 나 server 일 때만 2회. 401 은 QueryCache 와 MutationCache 의 onError 한 곳에서 `redirectToLogin` (`src/lib/auth/redirectToLogin.ts`) 으로 보낸다(클라이언트당 1회, 전체 새로고침). 상세 쿼리가 404 면 같은 QueryCache onError 가 그 쿼리의 `meta.listOnNotFound` 에 적은 목록 키만 무효화한다(`src/lib/queryClient.ts:65`, 2026-11-13 없는 건은 404 카드와 리뷰 A1). 그 건이 서버에서 사라졌으니 목록에 남은 행을 걷어 낸다. 키 모양에 기대지 않는다. meta 가 없는 쿼리는 404 여도 아무것도 안 한다. meta 타입은 TanStack `Register` 로 `QueryKey` 다(`src/lib/queryClient.ts:11`). 화면의 상세 쿼리 19곳이 meta 를 적고, 빠뜨리면 `src/lib/query/listOnNotFound.test.ts` 가 잡는다.
- 서버 prefetch → `HydrationBoundary` (`src/app/providers.tsx:29`) 패턴이 15곳에 있다. 전 도메인 확대 예정.
- 드롭다운 기준 데이터는 `staleTime: Infinity` (`src/app/hooks/useDropdown.tsx:18`). 마스터 수정 mutation 이 명시적으로 무효화해야 한다.
- 낙관적 락(version 전송)은 BOM 상태 변경에만 있다. 409 를 받으면 공통 빌더가 그 mutation 의 무효화 키를 다시 가져온다(`src/lib/query/useInvalidatingMutation.ts`, onError). 충돌 안내는 공통 `ConflictDialog`. 다른 엔티티의 version 전송은 OpenAPI 계약 카드.
- mutation 은 도메인 `*.mutations.ts` 훅으로 모은다. 훅은 같은 파일의 `*_MUTATION_EFFECTS` 표를 읽어 무효화하므로 표가 곧 동작이다. 컴포넌트는 토스트, confirm, 모달 닫기만 맡는다. 공통 빌더는 `src/lib/query/useInvalidatingMutation.ts`. 2026-11-09 구매 8, 인사 10, 생산 10, 재고 4, 영업 4, 재무 1, 창고 2, 프로필 5, 알림 2 완료. 컴포넌트 안 `useMutation` 은 0건이다(2026-11-10, `grep -rnE "useMutation[<(]"` 기준. 제네릭 형태 2건은 PR #18 에서 정리). 견적 시뮬레이션과 재고 확인처럼 버튼으로 한 번 하는 요청도 도메인 훅으로 둔다. 읽기는 `useQuery` 로 하고 결과를 state 에 복사하지 않는다.

- 처리 버튼은 서버 상태를 보고 그린다(2026-11-12 이미 처리된 건의 버튼 카드). 승인, 처리 요청, 납품 같은 상태 전이 버튼과 체크박스는 처리할 수 있는 상태 목록(허용 목록)에 든 행에만 열린다. 모르는 상태 값은 잠근다. 같은 규칙을 목록과 모달이 쓰면 도메인 service 의 함수 하나로 둔다(`canProcessInvoice` `src/app/(private)/finance/finance.service.ts:58`, `canProcessQuote` `src/app/(private)/sales/sales.service.ts:56`). 모달의 버튼은 열 때 받은 목록 값이 아니라 그 모달의 상세 쿼리 값을 본다(`PayrollDetailModal.tsx:168`, `QuoteReviewModal.tsx:249`). 처리 뒤 무효화가 상세를 다시 가져오면 같은 모달에서 버튼이 사라진다.
- 선택은 state 에 id 만 두고 렌더 중에 지금 목록에서 처리할 수 있는 행으로 걸러 쓴다(effect 로 지우지 않는다, R01, R02). 처리 뒤 다시 받은 목록에서 상태가 바뀌면 선택에서 저절로 빠지고 버튼이 잠긴다. "전체 선택"은 처리할 수 있는 행만 넣는다. 목록 다시 받기가 실패하면(캐시에 처리 전 값이 남는다) 고를 수 있는 행이 없는 것으로 보고, 모달은 상세 조회가 오류면 처리 버튼을 숨긴다. 본보기는 `InvoiceList.tsx:89`, `SalesQuoteList.tsx:73`, 생산의 `OrdersTab.tsx:90`, `QuotationTab.tsx:93`, `PlannedOrdersTab.tsx:93`.

  구매 무효화 매트릭스 (코드 `PURCHASE_MUTATION_EFFECTS` 를 옮긴 것. 다르면 코드가 맞다):

  | mutation        | 다시 가져오는 키                                                                                                                                 |
  | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
  | 발주 승인, 반려 | `purchaseOrderKeys.lists()`, `purchaseOrderKeys.detail(id)`, `purchaseStatsKeys.all`                                                             |
  | 발주 배송 시작  | 위 3개 + 재고 `receivingKeys.pendingLists()`, `inventoryStatsKeys.all`(배송중 발주가 입고 대기와 그 건수에 든다, 의도한 교차. 2026-11-13)        |
  | 구매 요청 승인  | `purchaseRequestKeys.lists()`, `.detail(id)`, `purchaseOrderKeys.lists()`(승인이 발주를 만들 수 있음, 서버 계약 미확인), `purchaseStatsKeys.all` |
  | 구매 요청 반려  | `purchaseRequestKeys.lists()`, `.detail(id)`, `purchaseStatsKeys.all`                                                                            |
  | 구매 요청 생성  | `purchaseRequestKeys.lists()`, `purchaseStatsKeys.all`                                                                                           |
  | 공급사 등록     | `supplierKeys.lists()`                                                                                                                           |
  | 공급사 수정     | `supplierKeys.lists()`, `supplierKeys.detail(id)`                                                                                                |

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
  | 제안납기 확정                        | `quotationKeys.lists()`, `mpsKeys.lists()`(확정한 견적이 그 납기 주 MPS 수요에 든다. 2026-11-13)                                               |
  | MES 시작, 완료, 공정 시작, 공정 완료 | `mesKeys.detail(mesId)`, `mesKeys.lists()`, `productionStatsKeys.all`                                                                          |

  나머지 도메인 무효화 매트릭스 (`INVENTORY_`, `WAREHOUSE_`, `SALES_`, `FINANCE_`, `PROFILE_`, `NOTIFICATION_MUTATION_EFFECTS`).
  "(낙관적)" 표시가 있는 4곳은 공통 빌더의 `optimistic` 옵션으로 응답 전에 캐시를 고친다. `setQueriesData`(prefix match)라 목록의 모든 페이지에 닿고, 실패하면 스냅샷으로 되돌리며, 성공과 실패 모두 끝나면 위 키를 무효화한다. 생성(고객, 자재, 창고 등록)은 낙관적 업데이트를 하지 않는다(결정 7, `ai/decisions.md` 2026-11-10 "낙관적 업데이트 범위").

  | mutation                            | 다시 가져오는 키                                                                                                                                                                                                                                                  |
  | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | 재고: 부족 재고 구매 요청           | `lowStockItemKeys.all` + 구매 `purchaseRequestKeys.lists()`, `purchaseStatsKeys.all`(의도한 교차)                                                                                                                                                                 |
  | 영업: 견적 생성                     | `quoteKeys.lists()`, `salesStatsKeys.all`                                                                                                                                                                                                                         |
  | 영업: 검토 요청                     | `quoteKeys.lists()`, `.detail(id)`, `.reviewDetail(id)`, `salesStatsKeys.all`                                                                                                                                                                                     |
  | 영업: 즉시 납품                     | 위 4개 + `salesOrderKeys.lists()`, `customerKeys.lists()`, `customerKeys.details()`, `analyticsKeys.all`(주문 수, 거래 금액, 매출 분석이 바뀐다. 2026-11-13) + 재고 `shippingKeys.readyToShipLists()`, `inventoryStatsKeys.all`(새 주문은 출고 준비, 의도한 교차) |
  | 재무: 전표 처리(ar, ap, supplierAp) | `invoiceKeys.lists(tab)`, `invoiceKeys.detail(id)`, `financeStatsKeys.all`                                                                                                                                                                                        |
  | 프로필: 휴가 신청                   | `profileKeys.attendanceRecords()` + 인사 `leaveKeys.lists()`(교차)                                                                                                                                                                                                |
  | 프로필: 출근, 퇴근                  | `profileKeys.todayAttendance()`, `.attendanceRecords()` + 인사 `attendanceKeys.lists()`(교차)                                                                                                                                                                     |
  | 프로필: 교육 신청                   | `profileKeys.trainings()` + 인사 `trainingKeys.lists()`(교차)                                                                                                                                                                                                     |
  | 알림: 전체 읽음, 하나 읽음          | `notificationKeys.lists()`, `notificationKeys.unreadCount()`(사이드바 뱃지)                                                                                                                                                                                       |

  알림(사이드바, 2026-11-12 알림 UI 연결 카드):

  1. 알림 버튼은 사이드바의 프로필 줄 위에 있다(`src/app/components/header/Notification/NotificationBell.tsx:28`). 사이드바는 도메인 레이아웃의 Provider 밖이라 `(private)/layout.tsx:22` 가 사이드바만 감싸는 QueryClient 를 하나 더 만든다(같은 `createQueryClient`). 화면을 옮겨도 남는다. 알림 키는 사이드바만 쓴다. `/profile` 은 레이아웃이 달라 그 화면의 클라이언트를 쓴다.
  2. 키는 `notificationKeys`(`src/app/components/header/header.keys.ts:2`). 목록 `list(page)` 와 안 읽은 수 `unreadCount()` 가 `['notifications']` 아래에 있다. 안 읽은 수는 `count?status=UNREAD` 로 받는다. 읽음 처리는 둘을 같이 무효화한다.
  3. 새 알림: `NEXT_PUBLIC_SSE_ENABLED=true` 면 SSE 로 붙고(`useNotificationSSE.ts:27`) `alarm` 이벤트와 (다시) 연결될 때마다 `notificationKeys.all` 만 무효화한다. 꺼져 있거나 끊겨 있으면 뱃지와 열린 목록이 60초마다 다시 받는다(`NotificationBell.tsx:39`). 끊기면 60초 뒤 다시 붙고 401 은 다시 붙지 않는다. 실패는 화면에 알리지 않는다.
  4. 안 읽은 수가 늘면 버튼 옆 `role=status` 가 한 번 알린다(SSE 든 폴링이든 같은 경로).
  5. 팝오버 내용(`NotificationDropdown.tsx`)은 버튼을 누를 때 받는 청크다(`React.lazy`, `NotificationBell.tsx:14`). 틀(dialog)과 닫기(Esc, 바깥 누름, 포커스 복귀)는 `NotificationBell` 에 있어 청크를 받는 중이거나 못 받아도 닫힌다. 못 받으면 틀 안에 실패 문구가 보인다. 응답은 `src/lib/api/notification.schemas.ts` 로 확인한다(`getParsedLazy`). 출처(`source`)는 문자열이면 받고 화면이 모르는 값은 "알 수 없음"으로 보인다.
  6. 목은 `src/mocks/handlers/alarm.handlers.ts`. 목록, 안 읽은 수, 읽음 처리가 같은 상태를 보고, 상태는 요청의 `Authorization` 값(로그인)별이다(`:78`). 브라우저 MSW 는 헤더가 없어 로그인을 바꿔도 상태가 하나다(개발용, 안 고침).

## 5-1. API 계약 (OpenAPI)

2026-11-10 OpenAPI 계약 1(창고), 2(나머지 도메인) 카드. 경로 129개, 요청 144개, 스키마 165개.

1. 원본은 `openapi/everp.yaml`(OpenAPI 3.1). 백엔드가 없어 프론트엔드가 쓴다. 성공 응답은 `ApiEnvelope` 에 `data` 를 더한 `allOf`, 실패는 `ApiError`. 목록과 짝인 상세 GET 19개는 `'404'` 에 `components.responses.NotFound`(본문 `ApiError`)를 단다(2026-11-13).
2. 타입은 `pnpm openapi` 가 `src/lib/api/openapi.gen.ts` 로 만든다(openapi-typescript). 손으로 고치지 않는다. 도메인 타입 파일의 응답, 요청 선언 160개는 `Schema<'이름'>`, `QueryOf<'경로'>` 별칭(`src/lib/api/contract.ts`)이다. 쿼리 파라미터 타입과 화면 props 는 아직 손 타입이다.
3. 창고 목은 `openapi-msw` 로 계약에 묶었다(`src/mocks/handlers/warehouse.handlers.ts`, 틀린 필드는 `tsc` 가 막는다). 나머지 목은 그대로 두고 4번의 런타임 검사로 묶는다. 새로 쓰는 핸들러는 openapi-msw 로 쓴다.
4. `src/test/contract/openapi.contract.test.ts` 가 세 가지를 본다. api 파일이 쓰는 엔드포인트 상수가 전부 계약에 있는지, 계약의 GET 응답 전부가 MSW 응답과 맞는지(`z.fromJSONSchema`, 상세는 목록에 있는 id 로 200 을, 없는 id 로 404 를 본다), 커밋된 생성 타입이 계약과 같은지(drift). CI 의 vitest 단계가 곧 계약 검사다.
5. 처음 옮길 때는 변환 스크립트를 썼다(`scripts/codemods/api-to-openapi.mts`, `types-to-aliases.mts`). 이제 계약이 원본이라 다시 돌리지 않는다. 영업, 구매, 생산 읽기와 대시보드, 재무, 인사, 재고, 창고에서 화면이 null 가드를 두던 읽기(타입 4차, 재무, 인사, 창고는 `getParsedLazy` 로 스키마를 요청과 같이 받아 첫 로드에서 뺀다)의 zod 스키마(`*.schemas.ts`)는 손으로 쓴 것이지만 별칭 타입에 묶여 있어 계약과 어긋나면 `tsc` 가 막는다.

## 6. 폴더 규칙과 import 방향

```
src/
  app/(private)/<domain>/   page.tsx, <domain>.api.ts, <domain>.service.ts, <domain>.keys.ts, components/, types/
  app/(public)/             login, callback(옛 흔적, /login 으로 리다이렉트만), profile, unauthorized
  app/api/                  auth/*, proxy/[...path], [...slug](서버 목, 프록시 증명 확인 뒤 src/server/serverMock.ts 가 MSW 핸들러를 서버에서 돌림)
  app/components/common/    앱 모델에 묶인 공통 UI(TableStatusBox, StatSection, 달력, 모달, 토스트 등). 나머지는 packages/ui
  lib/                      axios, auth, queryClient, role, status.constants
  mocks/                    MSW 핸들러 한 벌. 브라우저(워커), 단위 테스트(src/test/msw-server.ts), 서버 목이 같이 씀. 구체 경로를 :param 경로보다 앞에 정렬(src/mocks/handlers.ts). 역할에 따라 응답이 다른 목(대시보드 워크플로우 탭)은 x-session-role 헤더를 읽는다(서버 목 라우트가 프록시 증명의 역할로 정한다)
  store/                    Zustand 2개(auth 캐시, 사이드바)
  test/                     vitest 보조(MSW 서버, server-only mock)
```

import 방향: `components/common`, `lib` ← `(private)/<domain>` ← `page.tsx`. 2026-11-10 부터 린트가 강제한다(`eslint-rules/index.mjs`, error).

1. `everp/domain-boundary`: 다른 도메인은 공개 입구로만 가져온다. `@/app/(private)/<도메인>`(index.ts: 키, api, 타입, 상수), `@/app/(private)/<도메인>/ui`(ui.ts: 화면 컴포넌트), `@/app/(private)/<도메인>/messages`(messages.ts: 메시지 감싸개, 지금은 재고만). 나눈 이유는 키만 쓰는 도메인이 모달이나 메시지 JSON 까지 받지 않게 하려는 것이다(한 파일일 때 창고 첫 로드가 +21.7KB, 재고 index 에 메시지 감싸개가 있을 때 구매 첫 로드가 +5KB). 공통 코드(`src/lib`, `src/app/components` 등)는 도메인을 가져오지 않는다. 지금 공개 입구가 있는 도메인은 구매, 안전재고, 재고, 영업.
2. `everp/no-component-mutation`: `useMutation` 은 `*.mutations.ts` 와 `src/lib/query/` 에서만.
3. `everp/no-arbitrary-color`: className 의 임의 색(`bg-[#...]`) 금지. 3D 장면처럼 코드가 색을 정하면 상수를 style 로 넘긴다(`src/app/(private)/warehouse/components/warehouseVisualizer/stockColors.ts`).

타입 단언(`as`)과 non-null(`!`)은 0건이고 ESLint error 다(2026-11-10 타입 1차). 남긴 예외 1곳과 대신 쓰는 방식:

1. 모달 열기 `src/app/components/common/modal/ModalProvider.tsx:91`. `Omit<P, 'id' | 'onClose'>` 에 id 와 onClose 를 더하면 P 지만 제네릭 P 에서 TS 가 증명하지 못한다. 호출부 37곳의 리터럴 타입 추론을 지키려고 단언 한 줄을 남기고 이유를 적었다.
2. `Table<T>` 는 열 key 가 행 필드가 아닐 수 있어(`actions` 같은 가상 열) `keyof T` 로 묶지 않았다. 값은 `Reflect.get` 으로 꺼낸다 (`packages/ui/src/Table.tsx:76`).
3. 서버 응답을 믿는 자리는 타입 가드로 읽는다. 로그인과 세션 `readUserResponse`(`src/app/(public)/callback/userInfoType.ts`), FormData `formText`(`src/lib/formData.ts`). `ApiResponse` 판별 유니온과 zod 는 타입 2차 카드.

모달과 팝업 층(2026-11-10 접근성 2):

1. 모달 틀은 Radix Dialog(`src/app/components/common/modal/ModalContainer.tsx`). 열릴 때 포커스는 모달이 `data-autofocus` 로 표시한 요소, 없으면 첫 tabbable(닫기 버튼)로 간다(`:60`. React 의 `autoFocus` 는 겹친 모달에서 안 먹어 쓰지 않는다). 포커스 가두기, Esc(맨 위 모달만), 닫힌 뒤 연 요소로 포커스 복귀, 뒤 화면 aria-hidden 을 맡긴다. 배경 클릭으로는 닫지 않는다. 틀은 `next/dynamic` 으로 첫 로드에서 빼고 화면이 한가할 때 미리 받는다(`ModalProvider.tsx:18`, `:51`).
2. Radix 모달은 열리면 body 에 `pointer-events: none` 을 건다. 그래서 드롭다운 목록, 달력 같은 팝업은 `FloatingPortal` 대신 `PopoverPortal`(`src/app/components/common/PopoverPortal.tsx`)로 붙인다. 모달 안이면 모달 틀 안에, 밖이면 body 에 붙는다. 새 팝업 컴포넌트도 이것을 쓴다.
3. 모달 안에 팝업이나 충돌 안내(`role="alertdialog"`)가 떠 있으면 모달은 Esc 를 넘긴다. 팝업은 스스로 Esc 를 받아 닫아야 한다(`src/app/hooks/useCloseOnEscape.ts`).
4. `Dropdown` 은 APG 의 select-only combobox(2026-11-10 접근성 3). 버튼이 combobox, 목록이 listbox, 포커스는 버튼에 남고 가리킨 항목은 `aria-activedescendant`. 키보드와 aria 는 floating-ui interaction 훅(`src/app/components/common/Dropdown.tsx:71`). Esc 는 `useDismiss` 가 받는다. Radix Select 를 안 쓴 이유는 `ai/decisions.md` 접근성 3 행.
5. 확인 창은 `ConfirmModal`(`src/app/components/common/modal/ConfirmModal.tsx:25`) 하나다. 브라우저 `confirm()` 은 쓰지 않는다(2026-11-12, 화면 코드 0건). `openModal(ConfirmModal, { title: 질문 문장, onConfirm })` 로 열고, `onConfirm` 에는 도메인 훅의 `mutateAsync` 를 넘긴다. Promise 가 끝날 때까지 버튼을 잠그고 성공하면 닫고 실패하면 열어 둔다. 실패 문구는 훅의 `onError` 토스트가 보인다. 중복 제출은 세 겹으로 막는다: 확인 버튼 잠금, 같은 버튼에서 같은 모달을 또 열면 무시(`ModalProvider.tsx:106`, 모달 틀 청크가 오기 전 Enter 두 번), 진행 중인 `mutateAsync` 재호출 거절(`src/lib/query/useInvalidatingMutation.ts:200`). `reason` 을 주면 필수 사유 칸이 생긴다(구매 요청 반려 `comment`, 발주서 반려 `reason`. 휴가 반려는 게이트웨이가 본문을 받지 않아 없다).
6. 사이드바 알림 팝오버는 예외로 portal 을 쓰지 않는다. 알림 버튼 바로 뒤 DOM 에 그리고 CSS 로 사이드바 오른쪽에 붙인다(`src/app/components/header/Notification/NotificationBell.tsx:125`). Tab 순서가 버튼, 목록, 프로필로 그대로 이어진다. floating-ui 의 `FloatingFocusManager` 를 쓰면 드롭다운이 있는 화면 7곳의 첫 로드가 2.9KB 늘었다. 폭은 `max-w` 로 화면 안에 묶는다(화면 폭에서 사이드바 224, 간격 12, 여백 8 을 뺀 값). 모달이 열려 있으면 사이드바 전체가 눌리지 않아 모달 안 팝업 문제(2번)는 생기지 않는다.

화면 틀과 스크롤(2026-11-12 화면 아래가 잘리는 곳):

1. 문서(`html`)는 스크롤하지 않는다. 비공개 화면의 바깥 스크롤 칸은 `src/app/(private)/layout.tsx:37` 의 `<main className="h-screen overflow-auto">` 다. 탭이 없는 화면(대시보드, 창고, 안전재고)은 이 칸에서 스크롤된다. `/profile` 은 레이아웃이 달라 문서가 스크롤된다.
2. 탭이 있는 화면(영업, 생산, 구매, 재고, 재무, 인사)은 화면 높이를 꽉 채우고 `TabNavigation` 의 내용 칸 하나가 스크롤 칸이다(`src/app/components/common/TabNavigation.tsx:78`, `overflow-auto`). 제목과 탭, 통계 띠는 고정이다.
3. 목록 탭은 최상위가 `h-full` 로 내용 칸 높이를 받고, 표가 `flex-1 min-h-0` 으로 남은 높이에 맞춰 줄어 자기 안에서 스크롤한다(`packages/ui/src/Table.tsx:92`, 표 머리 고정, 가로 스크롤도 여기). 그래서 내용 칸은 넘치지 않고 스크롤바가 둘 생기지 않는다. 행 안에 버튼이나 링크가 없는 표는 키보드로 이 칸에 못 가므로 `scrollLabel` 을 넘겨 이름 있는 region(`tabIndex=0`)으로 만든다(MES 표, 남은 접근성과 디자인 카드). 이 칸은 부모 `overflow-hidden` 을 꽉 채워 링을 안쪽(`outline-offset: -2px`)에 그린다.
4. 표가 아닌 긴 내용(차트, 카드 격자, 폼)은 줄지 않고 내용 칸에서 스크롤된다. 탭 컴포넌트가 따로 `overflow-auto` 를 달지 않는다(재무 현황에 있던 것은 지웠다). 내용 칸과 그 조상에 `overflow-hidden` 을 다시 넣으면 넘친 내용을 볼 방법이 없어진다.
5. 내용 칸은 `role="region"`, 이름은 활성 탭 이름, `tabIndex={0}` 이다(`?tab=` 이 없는 값이면 내용이 없어 이름과 `tabIndex` 를 빼서 빈 Tab 정지가 안 생긴다). 안에 포커스 받을 요소가 없는 탭도 키보드(방향키, PageDown, End)로 스크롤된다. 탭 화면마다 Tab 정지가 하나 는다.
6. 하위 탭(`SubNavigation`, 인사와 생산 MRP)은 2단 탭 줄이 없다. 활성 화면에 세그먼트(`TabButtons`)를 `tabButtons` 로 넘기고 화면이 자기 툴바 왼쪽에 둔다(`src/app/components/common/SubNavigation.tsx:37`). 고른 탭은 `?subTab=`, 모르는 id 는 첫 탭. 하위 화면은 따로 스크롤 칸을 두지 않는다. 넘치면 세그먼트 줄과 같이 2번 칸에서 스크롤된다.
7. 모달은 본문이 스크롤 칸이다(`src/app/components/common/modal/ModalContainer.tsx:101`, 높이는 화면의 90% 까지).
8. 회귀 테스트는 `e2e/clipped-content.spec.ts`. 비공개 화면과 탭, 하위 탭 30개, 화면 안 전환 8개, 모달과 팝업 34개를 1280x720 과 1512x772 에서 열어 잘린 곳(`e2e/clipped.ts` 의 `findClipped`)과 이중 스크롤이 0 인지 본다. 허용 목록은 없다. 새 탭이나 모달을 만들면 이 스펙의 목록에 더한다.

## 7. 환경 변수

| 이름                                                  | 어디서   | 뜻                                                                                                                                 |
| ----------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `SESSION_SECRET`                                      | 서버     | 세션 JWT 서명 키. 없으면 로그인과 검증 호출 때 throw. 빌드는 통과(`src/lib/auth/session.ts:9`)                                     |
| `BACKEND_API_URL`                                     | 서버     | 업스트림. 없으면 `/api/[...slug]` 목. `/production` 은 build 때 읽음(BOM 상태 버튼 숨김), 프록시는 요청마다 읽어 BOM PATCH 를 막음 |
| `NEXT_PUBLIC_API_BASE_URL`                            | 브라우저 | 기본 `/api/proxy`                                                                                                                  |
| `NEXT_PUBLIC_API_MOCKING`                             | 브라우저 | `enabled` 면 MSW 워커 시작 (`src/app/providers.tsx:22`)                                                                            |
| `NEXT_PUBLIC_SSE_ENABLED`                             | 브라우저 | `true` 면 알림 SSE 로 붙는다. 없으면 60초 폴링(5절 알림). build 때 굳는 값                                                         |
| `AUTH_PROVIDER`                                       | 서버     | `demo`(기본) 또는 `oidc`. 4절                                                                                                      |
| `NEXT_PUBLIC_AUTH_PROVIDER`                           | 브라우저 | `oidc` 면 로그인 화면이 IdP 버튼 하나                                                                                              |
| `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` | 서버     | OIDC 모드에서만. 없으면 로그인 시작 때 throw                                                                                       |

CI 는 빌드용 더미 `SESSION_SECRET` 을 넣는다 (`.github/workflows/ci.yml`). 배포 값은 Vercel 프로젝트 env. Production 과 Preview 환경 둘 다에 있어야 로그인이 된다. 2026-11-09 PR #1 머지 뒤 배포 7건이 Vercel 에 env 가 하나도 없어 `session.ts` import 시점 throw 로 실패했다. 같은 날 비밀키 읽기를 호출 시점으로 옮겨 빌드는 env 없이도 통과하게 했고, `vercel env add SESSION_SECRET production|preview` 로 환경마다 다른 값을 넣었다(`openssl rand -base64 32`). 교체는 `vercel env rm` 뒤 다시 add.

## 8. 도구와 검증

- Node 24 (`.nvmrc`, `package.json` engines). pnpm 10(`packageManager` 고정, 2026-11-10 모노레포 1 카드), CI 는 `pnpm install --frozen-lockfile`. 설치 스크립트는 `pnpm-workspace.yaml` 의 `onlyBuiltDependencies`(msw, unrs-resolver)만 돈다.
- 모노레포: 앱은 루트, 패키지는 `packages/*`. `@everp/eslint-plugin`(로컬 린트 규칙), `@everp/ui`(앱에 안 묶인 공통 컴포넌트 25개. 앱은 TS 소스를 그대로 가져오고 Next 가 `transpilePackages` 로 변환한다. 밖에 낼 때의 모양은 `pnpm --filter @everp/ui build`: Vite 라이브러리 모드로 ESM 만, 파일마다 하나씩(preserveModules), react 와 floating-ui 는 번들하지 않음, `tsc` 로 d.ts, 토큰 CSS 복사. `publishConfig.exports` 라 `pnpm pack` 때만 exports 가 dist 로 바뀐다. `check:lib` 이 Button 하나만 가져온 번들에 다른 컴포넌트 코드가 없는지 본다(verify 에 포함)). `pnpm verify` 가 Turborepo 로 lint, 타입 검사, 단위 테스트, 패키지 테스트를 돌리고 입력이 같으면 캐시에서 꺼낸다(`turbo.json`). CI 는 `.turbo/cache` 를 캐시한다. 앱을 `apps/erp` 로 옮기는 것은 Vercel Root Directory 설정(대시보드)을 바꿔야 해서 미뤘다.
- Storybook: `packages/ui/.storybook`(react-vite, a11y 애드온). `pnpm --filter @everp/ui storybook` 으로 띄운다. 스토리는 `packages/ui/src/*.stories.tsx`, `stories.test.tsx` 가 모든 스토리를 그리고 play 를 돌리고 axe(색 대비 제외) 위반 0 을 본다. `pnpm verify` 가 Storybook 빌드까지 한다.
- 디자인 토큰: `packages/ui/tokens.css` 가 원본(색 `@theme static`, z-index 변수와 `@utility z-modal` 등, 애니메이션). 앱 `src/styles/globals.css` 와 Storybook `preview.css` 가 가져온다. 층 순서는 local 10 < header 30 < sidebar 40 < overlay 50 < modal 1000 < toast 1100 < popover 9999.
- CI: PR 과 main push 에서 `pnpm verify`(lint, 타입, 단위 테스트, Storybook) → build → 번들 크기 비교(라우트당 +5KB) → e2e(next start) → Lighthouse(`perf/lighthouse.sh`: 로그인과 로그인 뒤 3화면, 데스크톱 1회, 접근성 0.9 미만이면 실패, 성능은 경고). 번들과 Lighthouse 표는 job summary 와 PR 코멘트 하나(다음 실행은 같은 코멘트를 고친다). Lighthouse 보고서는 밖으로 올리지 않고 artifact 로만. Vercel 은 GitHub 연동으로 main 머지 때 Production 배포만 한다. PR 브랜치의 preview 는 `vercel.json` 의 `git.deploymentEnabled` 로 껐다(2026-11-10, 무료 플랜 하루 배포 한도를 PR preview 가 다 써서 운영 배포가 밀렸다. 머지 판단은 CI 의 같은 빌드 e2e 가 한다). 화면을 미리 보여 줄 일이 있으면 `vercel deploy` 로 한 번 올린다.
- 언어(i18n): next-intl 4.14.9. 메시지는 `src/i18n/messages/{ko,en}.json`. URL 에 언어를 넣지 않고 쿠키(`NEXT_LOCALE`)로 고른다. 서버는 늘 한국어로 정적 렌더하고 브라우저가 쿠키를 읽어 바꾼다(`src/i18n/IntlProvider.tsx`, 레이아웃이 쿠키를 읽으면 모든 페이지가 동적 렌더로 바뀐다). 플러그인 `precompile` 로 ICU 해석기를 빌드 때 빼서 첫 로드 증가가 14.5KB → 5.7KB. 남은 한국어 문자열 수는 `node scripts/count-hangul.mjs`. 화면 파일(`(private)`, `(public)`, `components`, `hooks`, `utils`, `error.tsx`, `not-found.tsx`, `packages/ui/src`)의 한국어 문자열은 `src/i18n/hangulStrings.test.ts` 가 파일별 예외 목록(이유 포함)과 정확히 맞춘다. en 메시지 값에 한글이 없는지는 `src/i18n/messages.test.ts` 가 본다(예외 `profile.korean`). 영어 화면에서 화면이 그린 글자(표 머리, 버튼, h1 h2, 라벨, 통계 dt dd, 입력 안내)에 한글이 없는지는 `src/test/chromeHangul.ts` 로 단위 테스트와 e2e(`e2e/i18n.spec.ts`)가 본다(표 본문, 목록 항목, `translate="no"` 는 서버 데이터라 뺀다). 서버가 코드와 글자를 같이 주는 드롭다운(상태 필터, 검색 타입)은 `useOptionLabels` (`src/app/hooks/useOptionLabels.ts:13`)로 아는 코드만 메시지 글자로 덮는다(상태 코드는 `status`, 그 밖은 화면이 넘긴 글자, 모르는 코드는 서버 글자). 부서, 제품 이름 같은 데이터 드롭다운에는 쓰지 않는다. 서버 응답 `message` 는 성공 토스트와 로그인 오류에도 보이지 않는다(언어를 모른다). 코드에서 안 쓰는 메시지 키는 `node scripts/unused-messages.mjs` 가 찾고 `src/i18n/unusedMessages.test.ts` 가 0 을 건다(2026-11-12 죽은 코드 정리). 키 조각이 같은 파일의 리터럴이면(``t(`process.${key}`)`` 와 `key: 'startMesSuccess'`) 스크립트가 찾는다. 조각이 서버 값이거나 다른 파일에서 오면 스크립트의 `DYNAMIC_PREFIXES` 에 접두사와 그 키를 만드는 파일을 적는다. 그 파일이 없어지거나 접두사로 키를 만드는 곳이 사라지면(낡은 접두사), 또는 접두사 없이도 찾을 수 있으면(필요 없는 접두사) 테스트가 실패한다. 없는 주소 화면(`src/app/not-found.tsx`)은 기본 메시지 `notFound` 를 쓴다. 재고 분류와 창고 유형의 표시용 별칭은 `src/app/(private)/inventory/inventory.labels.ts`에서 `src/i18n/messages/inventory/{ko,en}.json`의 `inventory.labels` 메시지에 연결한다. 미확인 코드는 원문을 보이고 서버 값은 바꾸지 않는다. 수량과 금액 글자는 `src/app/utils/number.ts` 의 `formatNumber`, `formatCurrency` 로 낸다(쉼표 고정, 언어를 넘기지 않은(인자 없음, `undefined`) `toLocaleString()`, `toLocaleDateString()`, `toLocaleTimeString()` 은 브라우저 언어를 따라 쓰지 않는다. `eslint.config.mjs` 의 `no-restricted-syntax` 가 error 로 막고 테스트 파일만 뺀다). 차트 축과 라벨의 짧은 금액은 `compactWon` 하나다(재무, 자재 흐름, 영업 차트). 화면 언어(`useLocale()`)를 인자로 받는다(`src/app/utils/number.ts:25`). 툴팁은 `formatCurrency`.
  패키지 UI 문구는 `packages/ui/src/UiText.tsx:13` 의 `UiText` 타입과 한국어 `defaultUiText` 가 정한다. `UiTextProvider` 로 앱 번역을 받는다. `src/i18n/UiTextBridge.tsx:15` 가 `src/i18n/messages/{ko,en}.json` 의 `ui` 를 연결한다. 새 문구는 타입, 기본값, 브리지, ko/en 메시지 네 곳을 함께 고친다.
  입력 아이콘 버튼 이름과 `InputList` 입력칸, 삭제 버튼 이름(화면 순번을 받는 함수 `inputList.item`, `inputList.remove`)도 이 경로를 쓴다(`UiText.tsx:43`, `UiTextBridge.tsx:50`). 충돌 설명의 한국어 목적격 조사는 `packages/ui/src/koreanObjectParticle.ts:2` 를 기본값과 브리지가 함께 쓰며, 한글 받침에 따라 을/를을 고른다. 비한글은 기존 을을 유지하므로 현재 호출부의 BOM 문구는 같다.
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
| /alarm        |      13 |                263.9 |    824.8 | framer-motion(2026-11-12 디버그 화면과 같이 지움)                 |
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

1. 요청 ID: 프록시가 요청마다 `x-request-id` 를 정해 업스트림과 응답에 싣는다(`src/app/api/proxy/[...path]/route.ts`, 들어온 값은 영숫자와 `-` 8~64자일 때만). `AppError.requestId` 가 받고 `TableStatusBox`, `StatSection` 이 `useRequestIdLabel` (`src/i18n/useErrorMessage.ts:13`)로 번역한 이름과 앞 8자를 보인다. 5xx 와 연결 실패는 서버 로그에 JSON 한 줄(`evt: proxy`). 연결 실패는 502.
2. Error Boundary 3층: `src/app/global-error.tsx`(루트 레이아웃까지 깨질 때), `src/app/(private)/error.tsx`(헤더와 메뉴는 남고 본문만), 모달(`ModalContainer` 안 `ErrorBoundary`, 그 모달만 오류로 바뀌고 닫을 수 있다). `src/app/error.tsx` 는 (private) 밖. 운영에서는 stack 대신 digest. 경계는 Next 16 의 `retry()` 를 쓴다. 글자는 화면 언어를 따른다. `src/app/error.tsx`, `(private)/error.tsx`, 모달은 next-intl(`errorBoundary`, `modal` 메시지), `global-error.tsx` 는 언어 provider 밖이라 `NEXT_LOCALE` 쿠키(`readCookieLocale`, `src/i18n/locale.ts:14`)를 직접 읽고 파일 안 ko, en 표에서 고른다(결정 기록 오류 경계 영어 행). `error.message` 는 화면과 복사 내용에 두지 않고 콘솔에만 남긴다(개발 모드는 원인 문구와 stack, `src/lib/devErrorDetail.ts`).
3. web-vitals: `WebVitalsLazy`(첫 로드에서 뺌)가 `/api/vitals` 로 sendBeacon. 서버는 모양과 크기(2KB)를 보고 로그 한 줄(`evt: web-vital`).
4. Sentry 와 Vercel Speed Insights 는 계정과 대시보드 설정이 필요해 붙이지 않았다. 붙일 자리는 `global-error.tsx`, `ErrorBoundary.componentDidCatch`, `/api/vitals`.

## 9. 안 하기로 한 것 (SKIP)

| 항목                                                                                                                                                        | 이유                                                                                                                                                                | 기록                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 모바일 대응                                                                                                                                                 | 데스크톱 ERP 운영자. 최소 뷰포트 1280px                                                                                                                             | `ai/decisions.md` 2026-11-09                           |
| 전면 FSD                                                                                                                                                    | 도메인 9개, 개발자 1명. 규칙 2개만 린트로                                                                                                                           | 같은 날                                                |
| Zero-runtime CSS 추가                                                                                                                                       | Tailwind v4 가 이미 빌드 타임                                                                                                                                       | 같은 날                                                |
| Jotai                                                                                                                                                       | 전역 상태 2개                                                                                                                                                       | 같은 날                                                |
| Next Cache Components, PPR                                                                                                                                  | 인증 뒤 동적 화면이라 적용 면이 거의 없음                                                                                                                           | 계획 문서 18절                                         |
| 가상화                                                                                                                                                      | 페이지 크기 10                                                                                                                                                      | 같은 날                                                |
| 레이아웃 서버 컴포넌트 전환                                                                                                                                 | 사이드바, 가드, 화면 폭이 클라이언트라 레이아웃만 서버로 돌려도 첫 로드 JS 가 거의 같다. 페이지 본문도 전부 클라이언트(`XClient`)                                   | 성능 블록 마무리 2026-11-10                            |
| 목록 서버 prefetch + HydrationBoundary                                                                                                                      | 데이터가 사용자 세션에 묶여 있어 정적 렌더(○)가 매 요청 동적 렌더로 바뀐다. 측정상 LCP 72~272ms(CPU 4배)라 얻을 것이 작다                                           | 같은 날                                                |
| 행 hover prefetch                                                                                                                                           | 상세는 모달이 로딩 상태로 열리고 같은 키는 30초 캐시. hover 마다 요청이 늘어난다                                                                                    | 같은 날                                                |
| React Compiler                                                                                                                                              | 켜고 재 보니 첫 로드 JS 가 라우트마다 +8~22KB, 조작 중 JS 는 -6ms(8%), 커밋 -1. 목록이 페이지당 10행이라 리렌더 비용이 원래 작다. 재는 법은 `perf/compiler.spec.ts` | `ai/cards/2026-11-10_React_Compiler.md`                |
| 리렌더 Profiler 작업                                                                                                                                        | 화면 긴 작업 합이 4~59ms(CPU 4배). 고칠 만큼 큰 리렌더가 숫자로 안 보인다                                                                                           | 같은 날                                                |
| Grafana, Kibana, Terraform                                                                                                                                  | 서버가 없고 Vercel 유지                                                                                                                                             | 같은 날                                                |
| MES 간트를 생산 라인별로 묶기                                                                                                                               | MES 응답에 생산 라인 필드가 없다. 서버 계약에 라인이 생기면 다시 본다                                                                                               | `ai/cards/2026-11-10_시각화_3_MES_간트.md`             |
| BOM 트리 접기 상태를 URL 에                                                                                                                                 | BOM 트리는 모달 안이고 모달이 URL 에 없어 새로고침하면 닫힌다                                                                                                       | `ai/cards/2026-11-10_시각화_7_BOM_원가_롤업.md` 결정 2 |
| SharedWorker 로 SSE 연결 나누기                                                                                                                             | 계획 16-2 선택 항목. 알림 연결이 탭마다 하나라 탭이 적은 ERP 에선 얻는 게 작다                                                                                      | 마무리 2026-11-10                                      |
| Micro Frontend(창고 3D 를 별도 zone)                                                                                                                        | 계획 16-2 선택 항목. 공유 상태와 인증 쿠키를 나누는 비용이 크고 배포 단위가 하나다. SSO 포털로 "앱 둘" 경험은 이미 했다                                             | 같은 날                                                |
| Feature flag                                                                                                                                                | 계획 16-2 선택 항목. 운영 사용자가 없어 점진 배포로 얻을 것이 없다                                                                                                  | 같은 날                                                |
| Yarn PnP, WebView, React Native                                                                                                                             | 계획 16-3. Next 와 마찰, 데스크톱 전용                                                                                                                              | 같은 날                                                |
| 패키지 api-client, msw-handlers, config                                                                                                                     | 계획 16-1 모노레포 표. 쓰는 앱이 하나(포털은 자기 데이터)라 패키지로 나눠도 경계가 생기지 않는다. 계약은 `openapi/` 하나                                            | 같은 날                                                |
| 사용자 몫(외부 계정, 대시보드): Sentry, Turborepo 원격 캐시, 앱을 `apps/erp` 로 옮기기(Vercel Root Directory), Vercel preview 대상 e2e(배포 보호 우회 토큰) | AI 가 계정을 만들거나 비밀 값을 넣지 않는다                                                                                                                         | 같은 날                                                |

## 10. 확인하지 않은 것 (verified=false)

문서나 가정만 보고 쓴 것. 실제로 돌려 본 뒤 지운다.

| 항목                                                                                                                                  | 근거                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 확인 방법                             |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 실 서버가 `version` 필드와 409 를 돌려준다                                                                                            | 팀 기간 BOM 구현의 기억                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 서버 생기면 발주 수정으로 확인        |
| 날짜는 UTC ISO 8601 로 온다                                                                                                           | 가정                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | OpenAPI 계약에 명시 뒤 서버와 대조    |
| Vercel 배포본에서 `proxy.ts` 가 Node 런타임으로 돈다                                                                                  | Next 16 문서                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 배포 뒤 함수 로그                     |
| 모달 틀 청크를 받기 전(idle 전)에 모달을 열면 오버레이만 잠깐 보이고 곧 뜬다. 청크 로드가 실패하면 처리 없음                          | 접근성 2, 코드만 봄                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 느린 3G 로 첫 화면에서 바로 모달 열기 |
| 실제 스크린리더(VoiceOver, NVDA)가 모달과 드롭다운을 의도대로 읽는다                                                                  | axe 와 aria 속성만 확인                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | VoiceOver 로 창고 수정, 구매 필터     |
| 드롭다운 글자 입력 이동이 한글에선 안 된다(IME 조합 중 key 가 `Process`)                                                              | 접근성 3, floating-ui 코드                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 한글 입력기로 필터에서 글자 입력      |
| 서버가 통계의 `trend`(기간 추이)를 준다                                                                                               | 2026-11-10 시각화 1. 계약과 목만                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 서버 생기면 통계 API 응답             |
| 서버가 품목 재고 추이(`/items/{itemId}/stock-history`)를 준다                                                                         | 2026-11-10 시각화 2. 계약과 목만                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 서버 생기면 재고 상세                 |
| 재무 현황의 월별 손익과 미수금 경과를 서버가 준다                                                                                     | 2026-11-10 시각화 4. 계약과 목만 있고 서버 지원은 확인 전(verified=false). 인가는 BFF 표에서 사내 재무 역할로 막는다                                                                                                                                                                                                                                                                                                                                                                                                        | 서버가 두 경로를 열면                 |
| 날짜별 근태 집계를 서버가 준다                                                                                                        | 2026-11-10 시각화 5. 계약과 목만 있고 서버 지원은 확인 전(verified=false)                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 서버가 경로를 열면                    |
| 이번 달 자재 흐름(금액 그래프)을 서버가 준다                                                                                          | 2026-11-10 시각화 6. 계약과 목만 있고 서버 지원은 확인 전(verified=false). 인가는 BFF 표에서 운영 역할로 막는다                                                                                                                                                                                                                                                                                                                                                                                                             | 서버가 경로를 열면                    |
| BOM 자재 단가를 서버가 준다                                                                                                           | 2026-11-10 시각화 7. 계약 `BomLevelStructureNode.unitCost` 와 목만 있고 서버 지원은 확인 전(verified=false). 상위 원가는 화면이 계산한다                                                                                                                                                                                                                                                                                                                                                                                    | 서버가 필드를 주면                    |
| 서버 재고 목록이 `type=WAREHOUSE_NAME` 으로 창고 이름을 걸러 준다                                                                     | 2026-11-10 시각화 8. 화면의 검색 옵션(창고명)과 목만 봄                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 서버 생기면 창고 3D                   |
| 쓰기 뒤 서버가 주는 상태 값과 두 번째 쓰기 응답이 목과 같다                                                                           | 2026-11-12 목이 쓰기 결과를 따르게. 게이트웨이가 `Object` 로 넘겨 화면이 비교하는 값에 맞췄다(카드 결정 3)                                                                                                                                                                                                                                                                                                                                                                                                                  | 서버 생기면 화면마다 눌러 본다        |
| 포털 화면 데이터(받은 발주, 내 주문)를 서버가 준다                                                                                    | 2026-11-10 SSO 2. 고정 값                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 서버 생기면                           |
| 영어 사용자가 로그인 화면에서 한국어를 잠깐 보지 않는다                                                                               | 2026-11-10 i18n 1 결정 2. 서버는 한국어로 정적 렌더하고 브라우저가 바꾼다. 비공개 화면은 PrivateGuard 가 먼저 아무것도 안 그려 괜찮다                                                                                                                                                                                                                                                                                                                                                                                       | 영어로 바꾼 뒤 느린 3G 로 /login      |
| 알림 목록, 개수, 읽음 응답 본문(`content`, `isRead`, `count`, `processedCount`, null 인 `linkId`)                                     | 2026-11-12 알림 UI 연결. 게이트웨이가 Object 로 넘긴다(`AlarmHttpServiceImpl.java:48-63`). 알림 서버 사본의 DTO 만 봄                                                                                                                                                                                                                                                                                                                                                                                                       | 실서버 응답 샘플                      |
| 프록시를 거친 알림 SSE 가 끊기지 않고 온다. `alarm` 뒤 개수 API 가 바로 늘어 있다                                                     | 같은 카드. SSE 는 기본 꺼짐이라 가짜 `fetchEventSource` 와 목 스트림만 확인                                                                                                                                                                                                                                                                                                                                                                                                                                                 | SSE 를 켜고 알림 하나 받기            |
| 서버의 통계 `delta_rate` 가 직전 기간 대비 비율(0.12 = 12%)이다. 화면은 100 을 곱해 "+8.3%" 로 보인다(`src/lib/CreateStatCard.ts:20`) | 2026-11-12 목 데이터 현실성 리뷰 7. 계약(Stat 설명)과 게이트웨이 옛 목은 비율, 게이트웨이 대시보드 DTO 주석은 절대 차이(`DashboardValueDto.java:23-29`). 게이트웨이는 계산하지 않고 업스트림 값을 넘긴다                                                                                                                                                                                                                                                                                                                    | 팀에 실서버 응답 형태 확인            |
| 업스트림이 없는 id 의 상세에 404 를 준다. SCM 상세 10개의 404 본문이 `{ status, success: false, message }` 다                         | 2026-11-13 없는 건은 404. 게이트웨이는 업스트림 4xx 상태를 그대로 넘긴다. 영업, 재무, 인사 9개는 본문을 `ApiResponse.fail` 로 다시 만든다(`SdHttpServiceImpl.java:704-715`), SCM 10개는 업스트림 본문 그대로(`PpController.java:188-208`). 업스트림 코드는 사본에 없다. 업스트림이 HTTP 200 에 본문 `success: false, status: 404` 로 답하면 게이트웨이도 HTTP 200 을 주고(`SdHttpServiceImpl.java:364`), FE 는 `invalidShape`(`src/lib/axiosInstance.ts:37-40`)로 받아 오류는 보이지만 목록을 다시 받지 않는다(리뷰 관찰 2) | 실서버에서 지운 건의 상세 열기        |

### 10-1. 확인해서 지운 것

| 항목                                                | 확인한 날  | 어떻게                                                                                                                                                                                                                    |
| --------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel 함수에서 서버 목(msw getResponse)이 응답한다 | 2026-11-10 | 운영(4ever-fe.vercel.app)에 데모 관리자로 로그인해 `/api/proxy/scm-pp/iv/warehouses` 200, `x-request-id` 있음. 새 경로 `dashboard/supply-flow`, `business/fcm/analytics/monthly` 도 200, 대시보드에 자재 흐름 카드가 뜬다 |
| Vercel 이 pnpm 10 으로 설치, 빌드한다               | 2026-11-10 | 운영 배포 로그: "Detected pnpm-lock.yaml version 9 generated by pnpm@10.x", "Done in 2.4s using pnpm v10.34.8"                                                                                                            |
| Keycloak 25 가 Java 17 에서 뜬다                    | 2026-11-10 | 대신 Keycloak 26.8.1 + Java 21 로 띄워 OIDC e2e 5개 통과(인증 4단계). 25 와 17 조합은 쓰지 않는다                                                                                                                         |
| 알림 팝오버 청크를 못 받아도 문구가 보이고 닫힌다   | 2026-11-12 | 단위 테스트 `NotificationBell.chunk.test.tsx`(내용 모듈 import 실패). 브라우저를 오프라인으로 바꿔 보지는 않았다                                                                                                          |
