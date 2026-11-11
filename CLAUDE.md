# CLAUDE.md

## Project
EverP — ERP 프론트엔드. Next.js App Router 기반, 인증된 사용자가 재무·인사·재고·생산·구매·영업·창고 도메인을 관리하는 웹 앱.

## Critical Rules
- 커밋 타입: `feat | fix | refac | test | chore | docs` 만 허용 (commitlint 강제)
- `refactor` 아님 → **`refac`** 사용
- `NEXT_PUBLIC_API_MOCKING=enabled` 시 MSW 목 서버 활성화. axios 실패는 `AppError`(`src/lib/AppError.ts`)로 reject 된다. 실패를 빈 데이터로 바꾸는 fallback 은 없다(2026-11-09 제거)

## Architecture
```
src/app/
  (private)/       # 인증 필요 도메인별 라우트 (dashboard, finance, hrm, inventory, production, sales, purchase, warehouse, low-stock)
  (public)/        # 로그인 등 공개 라우트
  components/      # 공통 UI 컴포넌트
  lib/             # axios, auth, queryClient
  store/           # Zustand 전역 상태
  mocks/           # MSW 핸들러 (도메인별 분리)
```
각 도메인: `{domain}.api.ts` → `{domain}.service.ts` → `components/` + `types/`

## Tech Stack
- **Framework**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **Server State**: TanStack Query v5
- **Client State**: Zustand v5
- **HTTP**: Axios (Bearer 토큰 인터셉터)
- **Mocking**: MSW v2
- **Charts**: Recharts, D3, Three.js/R3F
- **UI**: MUI v7, Framer Motion, dnd-kit

## Build & Test Commands
```bash
pnpm dev         # 개발 서버
pnpm build       # 프로덕션 빌드
pnpm lint        # ESLint 검사
pnpm verify      # lint, 타입, 단위 테스트를 turbo 로(캐시)
```

## Domain Context
ERP 도메인: Finance(재무), HRM(인사), Inventory(재고), Production(생산·BOM·MES·MRP), Sales(영업), Purchase(구매), Warehouse(창고)

## Design
UI 작업은 `DESIGN_GUIDELINES.md`를 따른다. 새 컴포넌트를 만들기 전에 `src/app/components/common/`의 기존 컴포넌트를 수정해서 해결할 수 있는지 먼저 본다.

## Coding Conventions
- 도메인별 타입은 `types/` 폴더에 `{Entity}Type.ts` 파일로 분리
- API 함수는 `{domain}.api.ts`, 비즈니스 로직은 `{domain}.service.ts`
- 공통 컴포넌트는 `src/app/components/common/` 에 배치
- 모달은 `ModalProvider` 컨텍스트를 통해 관리
- **UI 구현 시 공통 컴포넌트를 최우선으로 사용**. 앱에 안 묶인 것은 `@everp/ui`(packages/ui), 앱 모델에 묶인 것은 `src/app/components/common/`
  - 레이아웃: `Flex`, `Spacing`
  - 데이터: `Table`, `Pagination`, `StatSection`
  - 입력: `Button`, `IconButton`, `Input`, `Dropdown`, `DateRangePicker`, `SearchBar`
  - 피드백: `TableStatusBox`, `ModalStatusBox`, `StatusLabel`, `LoadingSpinner`, `ConflictDialog`(409 충돌 안내)
  - 내비게이션: `TabNavigation`, `TabButtons`, `SubNavigation`
  - 날 것의 `<div style>` 나 raw `<table>` 대신 반드시 공통 컴포넌트 사용 여부를 먼저 검토

## Key Patterns

### API 응답 구조
```ts
// 공통 래퍼
ApiResponse<T> = { status, success, message, data: T }

// 목록 페이지
{ content: T[], page: Page }  // Page = { number, size, totalElements, totalPages, hasNext }

// 통계 (기간별)
{ week: T, month: T, quarter: T, year: T }
// T 내부: { value: number, delta_rate: number, trend?: number[] }  // trend 는 스파크라인용(시각화 1)
```

### 모달 열기
```ts
const { addModal } = useModalContext();
addModal(SomeModal, { title: '제목', width: '600px', /* ...props */ });
// 모달 컴포넌트는 반드시 ModalProps (id, onClose 포함) 를 extend
```

### 통계 카드 생성
```ts
// service.ts 에서 통계 응답 → StatCardType[] 변환
createStatCard(title, value, delta_rate, unit)  // unit: '₩' | '건' | '명' 등
```

### 드롭다운 옵션 로딩
```ts
// useDropdown(queryKey, fetchFn, mode)
// mode: 'include' → '전체' 항목 자동 추가, 'exclude' → ALL 제거, 'as-is' → 그대로
const { options, isLoading } = useDropdown('items', fetchItemList, 'include');
```

### 공통 타입
```ts
KeyValueItem = { key: string; value: string }  // Dropdown items 등에 사용
```

### 상태값 글자와 화면 문구(i18n)
상태 글자는 `src/i18n/messages/{ko,en}.json` 의 `status`. 화면은 `StatusLabel` 을 쓴다(색은 `src/lib/status.constants.ts`).
새 문구는 같은 메시지 파일에 ko 와 en 을 같이 넣고 `useTranslations` 로 꺼낸다(키가 같은지는 `src/i18n/messages.test.ts` 가 본다).
```ts
const t = useTranslations('status');
t('APPROVED') // → '승인' / 'Approved'
```

### 엔드포인트 관리
모든 API URL은 `src/app/types/api.ts`의 `*_ENDPOINTS` 상수로 관리
```ts
// 동적 경로는 함수형으로 정의
QUOTE_DETAIL: (id: string) => `${BASE}/quotations/${id}`
```

### MSW 핸들러 추가
`src/mocks/handlers/{domain}.handlers.ts` 에 추가 후 `handlers.ts`에서 spread

### 권한 확인
```ts
const role = useRole();  // useAuthStore에서 userInfo.role 반환
```

## 우선순위 — 둘 다 못 지키면 위의 것을 지킨다

재고, 구매, 생산, 재무를 다루는 ERP라 응답 속도보다 값이 맞는 게 먼저다. 코드를 짜거나 리뷰할 때 충돌하면 이 순서다. 2026-11-08 멘토링의 "정합성 > 성능 > 유지보수성"을 FE 말로 옮겼다. 이 절이 원본이고 README는 여기를 가리킨다.

| 순위 | 지키는 것 | 이 프로젝트에서 실제로 보는 곳 |
|---|---|---|
| 1 | 화면이 서버와 어긋나지 않는다 | mutation 뒤 무효화할 쿼리 키 범위(통계 카드 포함, 다른 도메인은 건드리지 않기), 낙관적 락 409 처리, 중복 제출 방지, 늦게 도착한 응답 버리기 |
| 2 | 사용자가 한 일을 잃지 않고 실패를 숨기지 않는다 | 폼 에러 시 입력 보존, `TableStatusBox`와 `ModalStatusBox`로 실패 표시, 재시도 경로 |
| 3 | 빠르게 느껴진다 | TanStack Query 캐시와 `staleTime`, 중량 컴포넌트 동적 임포트, 불필요한 리렌더 |
| 4 | 다음 사람이 고칠 수 있다 | 공통 컴포넌트 우선, `api → service → components` 분리, 린트 0 |

- 가용성, 인프라, CPU와 메모리 수치는 여기서 따지지 않는다.
- AI가 우선순위 항목 중 하나를 포기해야 하면 표의 위쪽 항목을 지키는 쪽으로 정한다. 이유는 `ai/decisions.md`에 출처 "(AI 결정)" 행으로 남긴다. 사람에게 묻는 것은 아래 "사람에게 묻는 것" 절뿐이다.

## AI 리뷰 규칙 (P0~P3)

Claude가 짠 코드는 커밋 전에 **Codex 리뷰**(`codex_review`)를 받는다. 2026-11-12부터 사람은 diff를 읽지 않는다. Codex 사용량이 없으면 작성자를 가린 새 Claude 에이전트가 같은 표로 리뷰하고 리뷰어 칸에 그렇게 적는다. 리뷰 결과는 `ai/reviews/YYYY-MM-DD_<주제>.md`에 심각도별로 적는다.

| 레벨 | 뜻 | 처리 |
|---|---|---|
| P0 | 데이터가 깨지거나 보안 구멍 (잘못된 쿼리 무효화, 권한 우회, 토큰 노출) | 같은 커밋에서 고친다 |
| P1 | 흔한 경로에서 오동작 (목록 안 갱신, 모달 닫힘 안 됨) | 같은 커밋에서 고친다 |
| P2 | 드문 경로, 엣지 (빈 목록, 동시 클릭, 네트워크 느림) | 권고. 우선순위 1, 2에 걸리면 고친다. 안 고치면 `decisions.md`에 이유를 적는다 |
| P3 | 스타일, 네이밍, 주석, 문서 | 권고. 같은 규칙 |

- P2와 P3를 수정하지 않기로 했다면 `ai/decisions.md`에 이유를 적는다.
- 리뷰어에게 위 우선순위 표를 같이 준다. "이 순서로 보고 지적마다 레벨을 붙여라."
- 코드 규칙은 `ai/rules/react-typescript-antipatterns.md`(R01~R24). 새 코드는 이 규칙을 어기지 않고, 리뷰 지적에는 규칙 ID를 붙인다. 린트가 잡는 규칙은 `eslint.config.mjs`에, 못 잡는 것은 리뷰어가 본다(문서 맨 아래 표).
- 구조와 이유는 `ARCHITECTURE.md`. 코드를 고치기 전에 관련 절을 읽고, 고친 뒤 앵커 줄 번호를 갱신한다.

## 결정 기록

`ai/decisions.md`. 코드만 봐서는 알 수 없는 결정을 적는다 (DB, 라이브러리 선택, 정렬 동률, 빈 상태 표시, 권한 없는 사용자 처리, 리뷰 미반영 이유). 사람이 정한 것과 AI가 정한 것을 출처 칸으로 나눈다. AI가 정한 행은 출처에 "(AI 결정)"을 붙이고 이유 칸에 근거(우선순위 몇 번, 서버 사본 `파일:줄`)를 적는다. 새 행은 첫 번째 표(결정) 맨 아래에 넣는다. 두 번째 표는 안 하기로 한 제안만. 코드로 알 수 있는 것은 적지 않는다.

## 사람에게 묻는 것

2026-11-12부터 결정, 리뷰 반영, 화면 확인, 머지까지 AI가 하고 사람은 마지막 결과 보고만 본다. 아래만 먼저 묻는다.

- 되돌리기 어려운 것: main 에 force-push, `reset --hard`, 파일 대량 삭제, 기록 지우기
- 밖으로 나가는 것: 외부로 메시지나 글 발송, 결제, 외부 계정 만들기
- 비밀 값: 사용자 개인 자격증명, 운영 비밀 값 교체

백엔드 팀이 정할 것(서버 계약, 권한)은 묻지 않고 `verified=false` 로 남겨 결과 보고에 모은다.

## AI 작업 절차 (리팩토링 문제 하나당)

2026-11-07부터 코드는 Claude가 쓴다. 2026-11-12부터 사람은 diff를 읽지 않고 마지막 결과 보고만 본다. 문제 하나(계획 HTML의 한 행)를 이 순서로 돈다. 단계를 건너뛰지 않는다. 2026-11-09부터는 이 절차를 `.claude/skills/erp-loop/SKILL.md`가 카드 단위로 돌린다(`/erp-loop <문제 이름>`). 카드 템플릿은 `ai/cards/README.md`.

1. **결정 먼저.** 코드를 읽고, 코드만으로 정해지지 않는 것을 카드에 번호 목록으로 적는다. 라이브러리 선택, 쿼리 키 규칙, 빈 상태와 에러 표시, 우선순위 충돌. 우선순위 표 순서로 추천안을 골라 `ai/decisions.md`에 "(AI 결정)" 행으로 이유와 함께 적은 뒤에 짠다. 없으면 "결정할 것 없음"이라고 적고 넘어간다.
2. **구현.** 브랜치 `refac/<문제-요약>`. 우선순위 절 순서로 짠다. 커밋 전 `pnpm lint`와 `pnpm build` 통과.
3. **Codex 리뷰.** `review` 트리거(아래)로 돌린다. 결과는 `ai/reviews/YYYY-MM-DD_<주제>.md`.
4. **리뷰 반영과 화면 확인.** P0과 P1은 고쳐서 다시 리뷰. P2와 P3는 우선순위 1, 2에 걸리면 고치고, 안 고치기로 한 것은 이유와 함께 `ai/decisions.md`에 적는다. 그다음 카드의 완료 기준을 실제 화면(claude-in-chrome, 로컬 `pnpm dev --port 3100`, 데모 계정)에서 하나씩 확인해 카드 findings 절에 적는다. 플러그인이 안 붙으면 e2e 로 대신하고 그렇게 적는다.
5. **마무리.** 커밋 본문 끝에 `리뷰: ai/reviews/<파일>` 한 줄. PR 을 열고 필수 체크가 통과하면 rebase 머지한다(커밋, push, 머지는 `&&` 로만 잇는다). 사람에게는 결과 보고 하나를 낸다: 무엇이 달라졌나, 화면에서 직접 본 것과 못 본 것, AI가 정한 결정, 남은 것. 블로그 소재가 되는 문제(쿼리 키, 오류 분리, SSE)는 결정 기록 행 번호를 같이 적어 둔다.

### `review`
사용자가 `review`를 입력하면:
1. `git diff main...HEAD`를 뽑는다. 비어 있으면 작업 트리 diff를 쓴다.
2. `mcp__codex__codex_review`에 diff와 "우선순위" 절의 표, "AI 리뷰 규칙"의 P0~P3 표를 같이 준다. 지시는 "우선순위 순서로 보고 지적마다 레벨을 붙여라. 스타일 지적은 P3로 몰아라."
3. 결과를 `ai/reviews/YYYY-MM-DD_<주제>.md`에 `ai/reviews/README.md` 양식으로 쓴다.
4. 채팅에는 P0과 P1만 파일과 함께 보여주고, P2와 P3는 개수와 번호, 고칠지 말지 정한 결과를 보여준다.

## Trigger Keywords

### `ship`
사용자가 `ship` 을 입력하면 다음을 순서대로 실행:
1. `pnpm build` 실행 → 실패 시 즉시 중단 후 에러 보고
2. 빌드 성공 시 `git add .`
3. `git diff --cached` 로 변경 내용 분석 후 커밋 메시지 자동 생성 (커밋 타입 규칙 `feat|fix|refac|test|chore|docs` 준수)
4. `git commit -m "[생성된 메시지]"`
5. `git push`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
