# Dependabot: 월 1회 묶음 갱신

- 출처: 계획 16-1 "CI 고도화(Dependabot 월 1회 그룹)"
- 우선순위: 4
- 브랜치: chore/Dependabot
- 크기: 30분

## 완료 기준

1. `.github/dependabot.yml`: npm 과 GitHub Actions, 월 1회.
2. minor, patch 는 운영과 개발 의존성 별로 한 PR 에 묶는다. major 는 따로.
3. 나온 지 14일 지난 버전만(cooldown). 막 나온 버전의 공급망 사고를 피한다.
4. 커밋 접두사는 `chore`(commitlint 허용 타입).

## 결정 (AI 가 정함)

1. cooldown 14일. 이 레포에서 새 패키지를 들일 때 지켜 온 기준(나온 지 2주 지난 버전)과 같게.

## 결과

1. 설정 파일 하나. 테스트는 없다. GitHub 가 설정을 읽으면 Insights 의 Dependency graph 에서 확인한다(verified=false).
