# CI 고도화 2: Lighthouse CI 와 PR 코멘트

- 출처: 계획 16-1 "CI 고도화: 번들 크기 diff 코멘트, Lighthouse CI 3페이지"
- 우선순위: 3(빠르게 느껴진다를 숫자로 지킨다), 2(접근성 회귀를 막는다)
- 브랜치: chore/CI\_고도화\_2\_Lighthouse
- 크기: 반나절

## 완료 기준

1. CI 가 빌드 뒤 Lighthouse 를 돈다: `/login` 과 로그인 뒤 `/dashboard`, `/inventory`, `/finance`(데모 로그인 쿠키). 데스크톱, 1회.
2. 접근성 점수 0.9 미만이면 실패. 성능 0.8, 권장 사항 0.9 는 경고.
3. 로그인 뒤 화면이 `/login` 으로 돌아가 측정되면 실패(쿠키가 안 먹은 측정은 의미가 없다).
4. 번들 표와 Lighthouse 표를 job summary 와 PR 코멘트 하나에. 다음 실행은 같은 코멘트를 고친다. Dependabot PR 은 건너뛴다.
5. 보고서는 밖으로 올리지 않는다(LHCI 의 temporary-public-storage 는 공개 URL). artifact 로만.

## 결정 (AI 가 정함)

1. `@lhci/cli` 는 0.15.1 로 고정. 최신 0.16.0 은 나온 지 8일이라 Dependabot cooldown(14일)과 같은 기준으로 피했다.
2. 코멘트는 서드파티 액션 대신 러너의 `gh pr comment --edit-last`. 쓰기 권한은 `pull-requests: write` 하나.

## 결과

1. `perf/lighthouserc.cjs`, `perf/lighthouse.sh`(next start 3200, curl 로 데모 로그인, 쿠키를 extraHeaders 로), `perf/lighthouse-summary.mjs`(표, 최종 URL 검사).
2. 로컬 첫 측정(데스크톱, 1회): 로그인 성능 99 접근성 100, 대시보드 96/100, 재고 77/98, 재무 99/100. LCP 0.8~1.4초, TBT 0.
3. 찾은 것: 재고 화면 CLS 0.433. 성능 점수가 낮은 이유다. 다음 카드 "재고 화면 레이아웃 밀림".
