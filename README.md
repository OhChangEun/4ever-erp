# 4EVER ERP

> 기업의 자원을 통합 관리하는 풀스택 ERP(Enterprise Resource Planning) 시스템의 프론트엔드

---

## Background

기업 내 여러 부서(구매, 영업, 재고, 생산, 재무, 인사 등)는 각각 분리된 툴을 사용하거나 수작업 처리로 인해 데이터 단절, 의사결정 지연, 업무 비효율이 발생합니다.

**4EVER ERP**는 이러한 문제를 해결하기 위해 기획된 통합 자원 관리 웹 애플리케이션입니다. 하나의 플랫폼에서 구매·영업·재고·생산·재무·인사 업무를 연결하고, 역할 기반 접근 제어(RBAC)를 통해 각 담당자가 필요한 정보만 안전하게 조회·처리할 수 있도록 설계되었습니다.

---

## 주요 기능

| 모듈                    | 설명                                                         |
| ----------------------- | ------------------------------------------------------------ |
| **대시보드**            | 기간별(주/월/분기/연) 핵심 지표 카드 요약 및 워크플로우 현황 |
| **구매·조달 관리**      | 구매 요청 → 발주서 생성 전 프로세스 관리, 공급사 뷰 분리     |
| **영업 관리**           | 주문·견적·고객 관리, 고객사 전용 구매 뷰 분리                |
| **재고 관리**           | 재고 현황 조회 및 입출고 관리, 부족 재고(Low Stock) 알림     |
| **창고 관리**           | 창고 목록·상세 조회, Three.js 기반 3D 창고 시각화            |
| **생산 관리**           | 견적 → MPS → MRP → MES → BOM 전체 생산 계획 파이프라인       |
| **재무 관리**           | 전표 관리, 매출·매입 현황, 공급사·고객사 역할별 뷰 분리      |
| **인적자원 관리**       | 직원 정보, 급여, 근태, 교육 관리                             |
| **역할 기반 접근 제어** | Next.js Middleware를 통한 페이지별 권한 검증                 |

---

## 개발 목표

1. **사용자 경험 중심 설계**: 현대적인 사이드바 네비게이션, 반응형 레이아웃으로 다양한 환경에서 편리한 업무 환경 제공
2. **확장 가능한 컴포넌트 아키텍처**: 제네릭 Table, StatSection 등 재사용 가능한 공통 컴포넌트 라이브러리 구축으로 일관된 UI 보장
3. **성능 최적화**: 불필요한 SSR 제거, 라우트 단위 Provider 분리, 중량 컴포넌트 동적 임포트로 초기 로딩 속도 향상
4. **역할 기반 보안**: 미들웨어 수준의 RBAC 및 PKCE OAuth 인증 흐름 구현으로 안전한 데이터 접근 보장
5. **백엔드 독립 개발**: MSW를 활용한 Mock API로 백엔드 없이도 프론트엔드 전체 기능 시연 가능

## 나의 개발 내용

### 1. 사이드바 네비게이션 시스템 구축

상단 헤더 방식에서 현대적인 사이드바 방식으로 전환 구현

- **Zustand** 기반 접기/펼치기 전역 상태 관리 (`sidebarStore.ts`)
- 데스크탑(≥1024px): 고정 사이드바, 너비 토글(`w-64` ↔ `w-16`)
- 모바일(<1024px): 햄버거 버튼 + 오버레이 슬라이드 방식
- `(private)/layout.tsx`에서 사이드바 너비에 따른 `margin-left` 동적 적용

### 2. 공통 StatSection 컴포넌트

모든 모듈 페이지에서 반복되는 "헤더 + 기간 탭 + 지표 카드" 구조를 하나의 컴포넌트로 통일

- 기간(주/월/분기/연) 슬라이딩 탭 내장, 상태 자체 관리
- 지표 카드 숨기기/보기 토글 기능
- `Record<Period, StatCardType[]>` 타입으로 모든 모듈에서 재사용

### 3. 제네릭 Table 컴포넌트 공통화

모듈마다 중복 작성되던 테이블 UI를 단일 제네릭 컴포넌트로 교체

- `TableColumn<T>` 제네릭 타입으로 타입 안전성 확보
- `render` 함수를 통한 커스텀 셀 렌더링 지원
- 행 클릭 이벤트, 빈 상태(Empty State), 정렬 방향 설정 지원

### 4. SSR 성능 최적화

PageSpeed에서 TTFB 3~4초 문제를 분석하고 해결

- 원인: 서버 컴포넌트에서 실제 API 호출 시도 → 4초 타임아웃 → Fallback 반환
- 해결: 모든 페이지를 **클라이언트 컴포넌트**로 전환, 서버 타임아웃 1ms 처리
- 라우트 단위 Provider 분리(`_RouteProviders.tsx`)로 불필요한 전역 리렌더링 제거
- Three.js 3D 창고 뷰어, D3 BOM 차트를 `dynamic` + `ssr: false`로 지연 로딩

### 5. 공통 모달 시스템 (ModalProvider + useModal)

모듈마다 `useState`로 직접 열림/닫힘 상태를 관리하던 방식을 Context 기반 모달 스택으로 교체

- `ModalProvider`가 열린 모달 배열을 전역으로 관리, `createPortal`로 `document.body`에 직접 마운트
- `useModal` 훅의 `openModal(Component, props)`으로 어느 컴포넌트에서도 모달 호출 가능
- 모달 컴포넌트는 `ModalProps`를 상속받아 `id`, `onClose`를 자동 주입받으므로 닫기 로직 중복 작성 불필요
- 모달 열림 시 `document.body` 스크롤 잠금, Framer Motion `scale + opacity` 애니메이션 내장
- 다중 모달 동시 스택 지원(`removeAllModals`)

```tsx
// 사용 예시
const { openModal } = useModal();

openModal(OrderDetailModal, {
  title: '주문 상세',
  width: '800px',
  $orderId: selectedId,
});
```

### 6. 공통 Dropdown 컴포넌트 + useDropdown 훅

모듈마다 반복 작성되던 선택 UI와 API 호출 로직을 하나로 통합

**Dropdown 컴포넌트**

- `@floating-ui/react`의 `useFloating` + `FloatingPortal`을 사용해 레이어 충돌(z-index 문제) 없는 포지셔닝 구현
- 선택된 항목 유무에 따른 색상 분기(`bg-blue-100` / `bg-gray-100`), `sm` / `md` 사이즈 prop 지원
- 외부 클릭 감지로 자동 닫기, `autoSelectFirst` 옵션으로 초기값 자동 선택

```tsx
<Dropdown
  placeholder="창고 선택"
  items={warehouseOptions}
  value={selectedWarehouseId}
  onChange={setSelectedWarehouseId}
  size="sm"
/>
```

**useDropdown 훅**

- TanStack Query로 드롭다운 옵션 데이터를 `staleTime: Infinity`로 캐싱해 API 중복 호출 방지
- `mode` 옵션(`include` / `exclude` / `as-is`)으로 "전체" 항목 자동 추가/제거 처리

```tsx
const { options } = useDropdown('warehouses', fetchWarehouseOptions, 'include');
// → [{ key: '', value: '전체' }, ...fetchedItems]
```

### 7. 생산 관리 모듈

견적부터 생산 실행까지 전체 생산 계획 파이프라인을 탭 단위로 구현

**견적 관리 (QuotationTab)**

- 날짜 범위·가용재고 상태·견적 상태 필터 조합 검색
- 견적 목록 다중 선택 후 MPS 시뮬레이션 실행 → `SimulationResultModal`에서 결과 미리보기
- 견적 확정 처리 (`useMutation` + `queryClient.invalidateQueries`)

**MPS (주생산일정, MpsTab)**

- BOM 제품 드롭다운·날짜 범위 선택 시 주차별 수요·공급·재고·순소요 매트릭스 테이블 렌더링
- 현재 주차 하이라이트, 수요 수량 셀 클릭 시 `MpsPreviewModal`로 상세 조회

**MRP (자재소요계획, MrpTab → OrdersTab / PlannedOrdersTab)**

- 순소요 계산 결과 목록 조회 및 계획 주문 목록 조회
- 계획 주문 다중 선택 후 `MrpPurchaseRequestModal`에서 자재 수량 편집 → 구매 요청 직접 생성 (생산-구매 모듈 연계)

**MES (제조실행, MesTab)**

- 견적·상태 드롭다운 필터로 생산 작업 목록 조회
- 행 클릭 시 `ProcessDetailModal`에서 공정 단계별 상세 현황 조회

**BOM (자재명세서, BomTab)**

- BOM 목록 페이지네이션 조회 및 신규 BOM 생성 (`BomInputFormModal`)
- `BomDetailModal`: D3.js 기반 계층 트리 시각화 + BOM 상태 변경 (낙관적 락: 409 Conflict 감지 및 충돌 알림 처리)

---

### 8. 구매 관리 모듈

구매 요청 → 발주서 승인 전 프로세스와 공급업체 관리를 구현, 공급사(SUPPLIER_ADMIN) 역할 뷰 분리 포함

**구매 요청 (PurchaseRequestListTab)**

- 상태·검색 타입·키워드(디바운스)·날짜 범위 복합 필터
- 구매 요청 생성 (`PurchaseRequestModal`), 상세 조회 (`PurchaseRequestDetailModal`)
- 관리자 권한: 요청 일괄 승인 / 반려 (`useMutation`)

**발주서 관리 (PurchaseOrderListTab)**

- 발주서 목록 필터·검색·페이지네이션 조회
- 발주서 상세 조회 (`PurchaseOrderDetailModal`)
- 관리자: 발주서 승인 / 반려 처리, 공급사: 배송 시작 처리 (`postDeliveryStartOrder`) — 역할별 액션 버튼 분기

**공급업체 관리 (SupplierListTab)**

- 카테고리·상태·검색 타입 필터로 공급업체 목록 조회
- 공급업체 등록 (`SupplierFormModal`), 상세 조회 (`SupplierDetailModal`)

---

### 9. 인적자원 관리(HRM) 모듈

직원·부서·급여·근태·교육 5개 업무를 2단계 탭(메인 탭 → 서브 탭) 구조로 구현

**직원 관리 (EmployeesTab / DepartmentsTab)**

- 부서 필터·이름 키워드(디바운스) 검색으로 직원 목록 조회
- 직원 상세 조회 (`EmployeeDetailModal`), 정보 수정 (`EmployeeEditModal`), 신규 등록 (`EmployeeRegisterModal`)
- 부서 목록 조회, 부서 상세·수정 (`DepartmentDetailModal` / `DepartmentEditModal`)

**급여 관리 (PayrollManagement)**

- 연도·월·부서·상태 필터로 급여 내역 조회
- 급여 명세서 상세 조회 (`PayrollDetailModal`)

**근태 관리 (AttendanceTab / LeaveTab)**

- 출퇴근 기록 조회 및 수정 (`AttendanceEditModal`)
- 휴가 신청 목록 조회, 관리자 휴가 승인 / 반려 (`postLeaveRelease` / `postLeaveReject`)

**교육 관리 (EmployeeTrainingTab / AvailableProgramTab)**

- 직원별 교육 이수 현황 조회, 교육 배정 (`AddEmployeeTrainingModal`), 상세 조회 (`TrainingDetailModal`)
- 교육 프로그램 목록 조회, 프로그램 등록 (`AddProgramModal`), 수정 (`ProgramEditModal`), 상세 조회 (`ProgramDetailModal`)

---

### 10. RBAC 미들웨어

Next.js Middleware에서 쿠키 기반 역할 검증으로 페이지 접근 제어

- 역할 그룹(MM, SD, IM, FCM, HRM, PP)별 접근 가능 경로 테이블 정의
- 권한 없는 접근 시 `/unauthorized` 리다이렉트

---

## 스택 & 라이브러리

### Core

| 기술         | 버전   | 용도                              |
| ------------ | ------ | --------------------------------- |
| Next.js      | 16.1.6 | App Router 기반 풀스택 프레임워크 |
| TypeScript   | 5.x    | 정적 타입 시스템                  |
| Tailwind CSS | v4     | 유틸리티 퍼스트 스타일링          |

### 상태 관리 & 데이터 패칭

| 기술              | 용도                                       |
| ----------------- | ------------------------------------------ |
| TanStack Query v5 | 서버 상태 관리, 캐싱, 무한 스크롤          |
| Zustand v5        | 클라이언트 전역 상태 (사이드바, 인증 정보) |
| Axios             | HTTP 클라이언트, 인터셉터, Fallback 처리   |

### UI & 시각화

| 기술                          | 용도                       |
| ----------------------------- | -------------------------- |
| Recharts                      | 매출·재고 등 비즈니스 차트 |
| D3.js                         | BOM 트리 계층 구조 시각화  |
| Three.js / @react-three/fiber | 창고 3D 뷰어               |
| Framer Motion                 | 페이지·컴포넌트 애니메이션 |
| @dnd-kit                      | 드래그 앤 드롭 인터랙션    |
| MUI + MUI X Date Pickers      | 날짜 선택 UI               |
| @floating-ui/react            | 툴팁·팝오버 위치 계산      |
| Remixicon                     | 아이콘                     |

### 개발 환경 & 품질

| 기술               | 용도                         |
| ------------------ | ---------------------------- |
| MSW v2             | Service Worker 기반 Mock API |
| Husky + Commitlint | Git 커밋 메시지 컨벤션 강제  |
| ESLint + Prettier  | 코드 스타일 일관성           |

---

## 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│                     Next.js App Router                   │
│                                                          │
│  ┌─────────────────────┐   ┌────────────────────────┐    │
│  │   (public) routes   │   │   (private) routes     │    │
│  │  /login  /callback  │   │  /dashboard /purchase  │    │
│  │  /unauthorized      │   │  /sales /inventory     │    │
│  └─────────────────────┘   │  /production /finance  │    │
│                            │  /hrm /warehouse       │    │
│                            └──────────┬─────────────┘    │
│                                        │                 │
│                          ┌─────────────▼──────────────┐  │
│                          │   middleware.ts (RBAC)     │  │
│                          │   역할별 페이지 접근 제어    │  │
│                          └────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

클라이언트 레이어
┌─────────────────────────────────────────────────────────┐
│  TanStack Query  ←→  Axios  ←→  MSW (개발/데모 환경)     │
│  (서버 상태 캐싱)       (HTTP)      (Service Worker)     │
│                                                         │
│  Zustand (전역 상태)                                     │
│  ├── authStore   : 사용자 정보, 로그인 상태               │
│  └── sidebarStore: 사이드바 접기/펼치기 상태              │
└─────────────────────────────────────────────────────────┘

인증 흐름
┌──────────────────────────────────────────────────────────┐
│  PKCE OAuth 2.0                                          │
│  /login → code_verifier 생성 → /callback → token 저장     │
│  → Cookie(role) 설정 → middleware RBAC 적용               │
└──────────────────────────────────────────────────────────┘
```

### 디렉토리 구조 핵심 규칙

```
src/
├── app/
│   ├── (private)/          # 인증 필요 라우트 (Sidebar + RouteProviders)
│   │   ├── dashboard/      # 모듈명/
│   │   │   ├── page.tsx         # 페이지 진입점 (Client Component)
│   │   │   ├── [module].api.ts  # API 호출 함수
│   │   │   ├── [module].service.ts  # 데이터 변환 로직
│   │   │   ├── [module].utils.ts    # 유틸 함수
│   │   │   ├── components/      # 모듈 전용 컴포넌트
│   │   │   └── types/           # 모듈 전용 타입
│   │   └── ...
│   ├── (public)/           # 로그인·콜백 등 공개 라우트
│   └── components/common/  # 전역 공통 컴포넌트
├── lib/
│   ├── axiosInstance.ts    # Axios 설정 + Fallback 처리
│   └── auth/               # PKCE, 토큰 저장소
├── store/                  # Zustand 스토어
└── mocks/                  # MSW 핸들러
```

---

```bash
npm install
npm run dev
```

> 백엔드 서버 없이도 MSW Mock API로 전체 기능을 확인할 수 있습니다.
