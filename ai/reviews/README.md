# Codex 리뷰 기록

규칙은 `CLAUDE.md`의 "AI 리뷰 규칙". 파일 하나 = 리뷰 한 번. 이름은 `YYYY-MM-DD_<주제>.md`.

```markdown
# 2026-11-10 쿼리 키 정리 리뷰

- 대상: `git diff <base>..<head>` (파일 n개)
- 리뷰어: Codex (`codex_review`), 우선순위 표 전달
- 결과: P0 0 / P1 1 / P2 2 / P3 1

| 레벨 | 파일 | 지적 | 처리 |
|---|---|---|---|
| P1 | src/.../inventory.service.ts | 발주 요청 뒤 통계 카드 쿼리 무효화 누락 | fixed <해시> |
| P2 | ... | 동시 클릭 시 두 번 호출 | 미반영. `../decisions.md`의 2026-11-10 "동시 클릭 중복 호출" 행 참조 |
```
