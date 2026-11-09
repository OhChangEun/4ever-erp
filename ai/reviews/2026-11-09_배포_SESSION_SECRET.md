# 2026-11-09 배포 빌드가 SESSION_SECRET 에 묶이지 않게 리뷰

- 대상: `git diff origin/main` (6 파일, +127 / -16). 카드 `ai/cards/2026-11-09_배포_빌드가_SESSION_SECRET에_묶이지_않게.md`
- 리뷰어: Codex (`codex_review`), 우선순위 표와 P0~P3 표, 세 심사관 역할
- 결과: P0 0 / P1 0 / P2 0 / P3 0

지적 없음. Codex 가 확인한 것: 비밀키가 없으면 로그인과 쿠키 검증 요청이 예외로 실패하고 인증을 우회하는(fail-open) 경로는 없다. 쿠키 없는 요청의 기존 401 과 리다이렉트, logout 은 그대로. 테스트는 `vi.stubEnv` 로 빈 값을 실제로 넣고 `resetModules` 뒤 새 모듈을 가져와 기존 캐시와 격리되며, 끝나면 env 를 복구한다.
