# 2026-11-10 CI 고도화 2 Lighthouse 리뷰

- 대상: 작업 트리 diff(ci.yml, perf/lighthouse*, @lhci/cli 0.15.1). 카드 `ai/cards/2026-11-10_CI_고도화_2_Lighthouse.md`
- 리뷰어: Codex (`codex_review --uncommitted`), 우선순위 표와 P0~P3 표. 2회
- 결과: P0 0 / P1 0 / P2 2 / P3 0 (둘 다 고침, 2회차 지적 없음)

| 레벨 | 파일                     | 지적                                                                                                           | 처리                                                                  |
| ---- | ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| P2   | .github/workflows/ci.yml | `.lighthouseci` 는 숨김 폴더라 upload-artifact 기본값이면 빠지고, `if-no-files-found: ignore` 가 그걸 가린다   | fixed. `include-hidden-files: true`, 없으면 경고                      |
| P2   | .github/workflows/ci.yml | 접근성 검사가 실패하면 그 자리에서 멈춰 요약 표와 PR 코멘트에 Lighthouse 결과가 빠진다. 회귀를 볼 때 표가 없다 | fixed. 측정과 요약의 종료 코드를 따로 받고 표를 남긴 뒤 실패로 끝낸다 |
