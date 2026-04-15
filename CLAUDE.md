# CLAUDE.md

## Project
EverP — ERP 프론트엔드. Next.js App Router 기반, 인증된 사용자가 재무·인사·재고·생산·구매·영업·창고 도메인을 관리하는 웹 앱.

## Critical Rules
- 커밋 타입: `feat | fix | refac | test | chore | docs` 만 허용 (commitlint 강제)
- `refactor` 아님 → **`refac`** 사용
- `NEXT_PUBLIC_API_MOCKING=enabled` 시 MSW 목 서버 활성화; axios 응답 실패 시 fallback 자동 반환

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
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
```

## Domain Context
ERP 도메인: Finance(재무), HRM(인사), Inventory(재고), Production(생산·BOM·MES·MRP), Sales(영업), Purchase(구매), Warehouse(창고)

## Coding Conventions
- 도메인별 타입은 `types/` 폴더에 `{Entity}Type.ts` 파일로 분리
- API 함수는 `{domain}.api.ts`, 비즈니스 로직은 `{domain}.service.ts`
- 공통 컴포넌트는 `src/app/components/common/` 에 배치
- 모달은 `ModalProvider` 컨텍스트를 통해 관리
- **UI 구현 시 `src/app/components/common/` 의 공통 컴포넌트를 최우선으로 사용**
  - 레이아웃: `Flex`, `Spacing`
  - 데이터: `Table`, `Pagination`, `StatSection`
  - 입력: `Button`, `IconButton`, `Input`, `Dropdown`, `DateRangePicker`, `SearchBar`
  - 피드백: `TableStatusBox`, `ModalStatusBox`, `StatusLabel`, `LoadingSpinner`
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
// T 내부: { value: number, delta_rate: number }
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

### 상태값 한글 매핑
`src/lib/status.constants.ts`의 `STATUS_TEXT_MAP` 사용
```ts
STATUS_TEXT_MAP['APPROVED'] // → '승인'
STATUS_TEXT_MAP['IN_PROGRESS'] // → '진행중'
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

## Trigger Keywords

### `ship`
사용자가 `ship` 을 입력하면 다음을 순서대로 실행:
1. `npm run build` 실행 → 실패 시 즉시 중단 후 에러 보고
2. 빌드 성공 시 `git add .`
3. `git diff --cached` 로 변경 내용 분석 후 커밋 메시지 자동 생성 (커밋 타입 규칙 `feat|fix|refac|test|chore|docs` 준수)
4. `git commit -m "[생성된 메시지]"`
5. `git push`
