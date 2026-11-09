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
                                  └─ 없음 → src/app/api/[...slug]/route.ts (서버 목, 1,885줄)
개발 시 NEXT_PUBLIC_API_MOCKING=enabled → MSW 서비스 워커가 브라우저에서 먼저 가로챔 (src/mocks/)
```

## 2. 요청 한 번의 경로

목록 화면이 데이터를 받기까지.

1. 도메인 `*.api.ts` 가 `*_ENDPOINTS` 상수로 URL 을 만든다. 기본 base 는 `/api/proxy` 다 (`src/app/types/api.ts:4`). 응답 래퍼는 `ApiResponse<T>` (`src/app/types/api.ts:14`).
2. 전역 axios 는 타임아웃 4초 (`src/lib/axiosInstance.ts:4`). 응답 인터셉터 하나가 두 가지를 한다. 2xx 인데 래퍼가 깨진 응답(`success === false`, GET 인데 `data` 없음)을 `invalidShape` 로 올리고 (`:22`), 실패는 전부 `AppError` 로 정규화해 reject 한다 (`:44`, 종류 9개는 `src/lib/AppError.ts:8`). 실패를 URL 별 빈 데이터로 바꿔치기하던 fallback 은 2026-11-09 에 지웠다(카드 `ai/cards/2026-11-09_오류를_빈_데이터로_숨기는_fallback_제거.md`). 화면은 `TableStatusBox` 와 `StatSection` 의 `error` prop 으로 종류별 한 줄을 덧붙인다 (`src/app/components/common/TableStatusBox.tsx:9`, `StatSection.tsx:20`).
3. `/api/proxy/[...path]` 가 받는다. 상태 변경 요청은 same-origin 검사 (`src/app/api/proxy/[...path]/route.ts:52`), 세션 쿠키 검증 (`:61`), 업스트림 base 결정 (`:43`, `:71`), 경로 정규화 뒤 도메인별 role 검사 (`:23` 규칙표, `:36` 인사 셀프서비스 예외), 쿠키를 떼고 `Authorization: Bearer` 를 붙여 fetch.
4. 업스트림이 없으면 `src/app/api/[...slug]/route.ts` 가 목 데이터를 돌려준다 (`:8` ok 헬퍼).
5. 화면은 TanStack Query 로 받는다. 키는 도메인별 팩토리 (`src/app/(private)/purchase/api/purchase.keys.ts:6` 가 표준 모양: all → lists → list(params), details → detail(id)). 리터럴 키는 0건.

## 3. 인증과 인가 (지금)

- 로그인은 데모 계정 선택이다. `/api/auth/login` 이 `DEMO_ACCOUNTS` 에 있는 아이디면 통과시키고 (`src/app/api/auth/login/route.ts:35`) HS256 으로 서명한 JWT 를 httpOnly 쿠키 `session` 에 심는다 (`:48`, 서명은 `src/lib/auth/session.ts:32`, 검증은 `:42`, 만료 1일 `:37`).
- 페이지 접근은 `src/proxy.ts` 가 막는다. 쿠키 검증 (`src/proxy.ts:36`) 뒤 경로별 role 표 (`:6`) 로 비교 (`:49`). matcher 는 공개 경로만 빼는 denylist (`:60`). Next 16 부터 파일 이름이 `middleware.ts` 에서 `proxy.ts` 로 바뀌었고 Node 런타임이 기본이다.
- 클라이언트 가드는 매 진입마다 `/api/auth/me` 로 확인하고 (`src/app/(private)/_PrivateGuard.tsx:20`) 결과를 `authStore` 에 캐시한다. 이 스토어는 localStorage 에 persist 된다 (`src/store/authStore.ts:12`). 표시용 캐시일 뿐 권한 판단에 쓰지 않는다.
- 프록시는 세션 JWT 자체를 Bearer 로 보낸다. 실 IdP 토큰이 없어서다. 실 서버가 생기면 반드시 바뀐다 (4절).

알려진 빚:

- 알림 SSE 훅이 옛 localStorage 토큰을 읽어 `Bearer null` 을 보낸다 (`src/app/components/header/Notification/useNotificationSSE.ts:32`, `:68`).
- 옛 SPA 시절 파일 4개가 남아 있다: `src/lib/auth/pkce.ts`, `refresh.ts`(데모 secret 문자열 포함), `tokenStorage.ts`, `startAuthorization.ts`. 참조는 SSE 훅 하나뿐.
- role 상수가 두 벌이다 (`src/lib/role.ts:1`, `src/app/types/role.constant.ts:1`). 페이지 규칙표와 프록시 규칙표도 모양이 다른 채 둘이다.

## 4. 인증과 인가 (목표)

OAuth2/OIDC 서버가 있다고 가정하고 네 모듈로 가른다. 서버가 생기면 구현체와 env 만 바꾼다. 세부는 옵시디언 `프론트엔드/4ever-erp_아키텍처와_루프_계획_2026-11-09.md` 8절과 `4ever-erp_BFF_인증_진단과_실습계획.md` Part D.

```
src/server/auth/
  idp/        IdentityProvider 인터페이스. DemoIdp(지금 데모 계정), OidcIdp(discovery + JWKS)   verified=false
  session/    SessionStore 인터페이스. Memory(개발) → 외부 스토어(실서버). 쿠키엔 sid 와 15분 role 클레임만
  authz/      policy.ts 하나. 페이지 규칙과 API 규칙을 같은 표에서 파생
  handlers/   login(GET→302), callback, logout 3종, me, backchannel-logout
```

## 5. 서버 상태 레이어

- QueryClient 는 한 팩토리 `createQueryClient` 에서 나온다 (`src/lib/queryClient.ts`). 서버 컴포넌트용 `cache()` 래퍼 `getQueryClient` (retry 0) 와 클라이언트 Provider (`src/app/providers.tsx`). 기본값은 staleTime 30초, gcTime 5분, 포커스 refetch 켬, retry 는 `AppError.kind` 가 network 나 server 일 때만 2회. 401 은 QueryCache 와 MutationCache 의 onError 한 곳에서 `redirectToLogin` (`src/lib/auth/redirectToLogin.ts`) 으로 보낸다(클라이언트당 1회, 전체 새로고침).
- 서버 prefetch → `HydrationBoundary` (`src/app/providers.tsx:29`) 패턴이 15곳에 있다. 전 도메인 확대 예정.
- 드롭다운 기준 데이터는 `staleTime: Infinity` (`src/app/hooks/useDropdown.tsx:18`). 마스터 수정 mutation 이 명시적으로 무효화해야 한다.
- 낙관적 락은 BOM 상태 변경에만 있다. version 전송 (`src/app/(private)/production/components/modals/BomDetailModal.tsx:45`), 409 처리 (`:53`). 공통 패턴으로 뽑을 원형.
- mutation 은 도메인 `*.mutations.ts` 훅으로 모은다. 훅은 같은 파일의 `*_MUTATION_EFFECTS` 표를 읽어 무효화하므로 표가 곧 동작이다. 컴포넌트는 토스트, confirm, 모달 닫기만 맡는다. 2026-11-09 구매 도메인 8곳 완료(`src/app/(private)/purchase/api/purchase.mutations.ts`), 나머지 28곳(인사 9, 생산 6, 재고 4, 영업 3, 프로필 3, 재무 1, 창고 1, 헤더 1)은 도메인별 카드.

  구매 무효화 매트릭스 (코드 `PURCHASE_MUTATION_EFFECTS` 를 옮긴 것. 다르면 코드가 맞다):

  | mutation                   | 다시 가져오는 키                                                                                                                                 |
  | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
  | 발주 승인, 반려, 배송 시작 | `purchaseOrderKeys.lists()`, `purchaseOrderKeys.detail(id)`, `purchaseStatsKeys.all`                                                             |
  | 구매 요청 승인             | `purchaseRequestKeys.lists()`, `.detail(id)`, `purchaseOrderKeys.lists()`(승인이 발주를 만들 수 있음, 서버 계약 미확인), `purchaseStatsKeys.all` |
  | 구매 요청 반려             | `purchaseRequestKeys.lists()`, `.detail(id)`, `purchaseStatsKeys.all`                                                                            |
  | 구매 요청 생성             | `purchaseRequestKeys.lists()`, `purchaseStatsKeys.all`                                                                                           |
  | 공급사 등록                | `supplierKeys.lists()`                                                                                                                           |
  | 공급사 수정                | `supplierKeys.lists()`, `supplierKeys.detail(id)`                                                                                                |

## 6. 폴더 규칙과 import 방향

```
src/
  app/(private)/<domain>/   page.tsx, <domain>.api.ts, <domain>.service.ts, <domain>.keys.ts, components/, types/
  app/(public)/             login, callback(옛 흔적, /login 으로 리다이렉트만), profile, unauthorized
  app/api/                  auth/*, proxy/[...path], [...slug](서버 목)
  app/components/common/    공통 UI 30개. 새로 만들기 전에 여기서 고칠 수 있는지 먼저
  lib/                      axios, auth, queryClient, role, status.constants
  mocks/                    MSW 핸들러(브라우저용). 테스트는 src/test/msw-server.ts 가 같은 핸들러를 Node 에서 씀
  store/                    Zustand 2개(auth 캐시, 사이드바)
  test/                     vitest 보조(MSW 서버, server-only mock)
```

import 방향: `components/common`, `lib` ← `(private)/<domain>` ← `page.tsx`. 도메인끼리 import 하지 않는다. 지금은 문서 규칙이고 커스텀 ESLint 규칙(플랫폼 블록)으로 강제할 예정.

`Table<T>` 는 `column.key` 가 string 이라 행 접근에 단언이 필요하다 (`src/app/components/common/Table.tsx:57`). `keyof T` 로 바꾸는 것이 타입 블록 카드.

## 7. 환경 변수

| 이름                       | 어디서   | 뜻                                                                                             |
| -------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `SESSION_SECRET`           | 서버     | 세션 JWT 서명 키. 없으면 로그인과 검증 호출 때 throw. 빌드는 통과(`src/lib/auth/session.ts:8`) |
| `BACKEND_API_URL`          | 서버     | 업스트림. 없으면 `/api/[...slug]` 목                                                           |
| `NEXT_PUBLIC_API_BASE_URL` | 브라우저 | 기본 `/api/proxy`                                                                              |
| `NEXT_PUBLIC_API_MOCKING`  | 브라우저 | `enabled` 면 MSW 워커 시작 (`src/app/providers.tsx:22`)                                        |

CI 는 빌드용 더미 `SESSION_SECRET` 을 넣는다 (`.github/workflows/ci.yml`). 배포 값은 Vercel 프로젝트 env. Production 과 Preview 환경 둘 다에 있어야 로그인이 된다. 2026-11-09 PR #1 머지 뒤 배포 7건이 Vercel 에 env 가 하나도 없어 `session.ts` import 시점 throw 로 실패했다. 같은 날 비밀키 읽기를 호출 시점으로 옮겨 빌드는 env 없이도 통과하게 했고, `vercel env add SESSION_SECRET production|preview` 로 환경마다 다른 값을 넣었다(`openssl rand -base64 32`). 교체는 `vercel env rm` 뒤 다시 add.

## 8. 도구와 검증

- Node 24 (`.nvmrc`, `package.json` engines). npm + lockfile, CI 는 `npm ci`. pnpm 전환은 모노레포 카드에서.
- CI: PR 과 main push 에서 lint → type-check → vitest → build (`.github/workflows/ci.yml`). Vercel 은 GitHub 연동으로 main 머지 때 Production 배포, PR 마다 preview.
- 로컬 훅: commit-msg 는 commitlint(타입 `feat|fix|refac|test|chore|docs`), pre-commit 은 lint-staged.
- 테스트: vitest + Testing Library + MSW. 설정 `vitest.config.mts`, 공통 `vitest.setup.ts`(핸들러 없는 요청은 실패시킴). 서버 전용 모듈 테스트는 파일 첫 줄에 `// @vitest-environment node`.
- 린트: `eslint.config.mjs`. 타입 인식 규칙을 warn 으로 켜고 주석에 측정값을 적어 뒀다. 억제 파일 `eslint-suppressions.json` 은 린트 블록이 끝나면 삭제.

## 9. 안 하기로 한 것 (SKIP)

| 항목                       | 이유                                      | 기록                         |
| -------------------------- | ----------------------------------------- | ---------------------------- |
| 모바일 대응                | 데스크톱 ERP 운영자. 최소 뷰포트 1280px   | `ai/decisions.md` 2026-11-09 |
| 전면 FSD                   | 도메인 9개, 개발자 1명. 규칙 2개만 린트로 | 같은 날                      |
| Zero-runtime CSS 추가      | Tailwind v4 가 이미 빌드 타임             | 같은 날                      |
| Jotai                      | 전역 상태 2개                             | 같은 날                      |
| Next Cache Components, PPR | 인증 뒤 동적 화면이라 적용 면이 거의 없음 | 계획 문서 18절               |
| 가상화                     | 페이지 크기 10                            | 같은 날                      |
| Grafana, Kibana, Terraform | 서버가 없고 Vercel 유지                   | 같은 날                      |

## 10. 확인하지 않은 것 (verified=false)

문서나 가정만 보고 쓴 것. 실제로 돌려 본 뒤 지운다.

| 항목                                                 | 근거                    | 확인 방법                          |
| ---------------------------------------------------- | ----------------------- | ---------------------------------- |
| 실 서버가 `version` 필드와 409 를 돌려준다           | 팀 기간 BOM 구현의 기억 | 서버 생기면 발주 수정으로 확인     |
| 날짜는 UTC ISO 8601 로 온다                          | 가정                    | OpenAPI 계약에 명시 뒤 서버와 대조 |
| Vercel 배포본에서 `proxy.ts` 가 Node 런타임으로 돈다 | Next 16 문서            | 배포 뒤 함수 로그                  |
| Keycloak 25 가 Java 17 에서 뜬다                     | BFF 실습계획            | 실습 때                            |
