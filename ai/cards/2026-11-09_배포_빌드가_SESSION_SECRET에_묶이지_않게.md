# 배포 빌드가 SESSION_SECRET 에 묶이지 않게

- 출처: 새 버그 (Vercel Production, Preview 배포 전부 실패. 2026-11-09 사용자 보고)
- 우선순위: 2 실패를 숨기지 않는다 (배포가 조용히 깨진 채 7건 쌓임), 4 유지보수성
- 브랜치: fix/배포_빌드가_SESSION_SECRET에_묶이지_않게
- 크기: 반나절

## 현상

1. PR #1 머지(2fa15c4) 이후 Vercel 배포 7건이 전부 실패했다. Production 3건, Preview 4건. `vercel inspect <url> --logs` 로 본 원인은 하나다.

   ```
   Error: Failed to collect configuration for /api/auth/login
   [cause]: Error: SESSION_SECRET is not set
   at module evaluation (src/lib/auth/session.ts:7:9)
   ```

2. `src/lib/auth/session.ts:5`~`:8` 이 import 시점에 env 를 읽고 없으면 throw 한다. Next 빌드는 라우트 모듈을 평가하면서(page data 수집) 이 import 를 실행하므로, env 가 없는 빌드 머신에서는 코드가 멀쩡해도 빌드가 죽는다.
3. Vercel 프로젝트 `4ever-fe` 에는 환경변수가 하나도 없었다(`vercel env ls`). CI 는 `.github/workflows/ci.yml` 이 더미 값을 넣어서 통과했고, 그래서 PR 체크는 초록인데 배포만 빨갰다.
4. 배포 실패는 PR 의 "Vercel" 체크에만 보이고 필수 체크가 아니라 머지를 막지 않았다. 세 PR 이 그대로 머지됐다.

## 재현

`SESSION_SECRET` 없이 `npm run build`. "Failed to collect page data for /api/auth/login".

## 영향 범위

- `src/lib/auth/session.ts` 와 그걸 import 하는 5곳(`src/proxy.ts`, `api/auth/login`, `logout`, `me`, `api/proxy/[...path]`). 동작은 그대로, 읽는 시점만 바뀐다.
- 쿼리 키, 공통 컴포넌트 없음.
- Vercel 환경변수: Production 과 Preview 에 `SESSION_SECRET` 추가(2026-11-09, `openssl rand -base64 32`, 값은 어디에도 기록 안 함).

## 완료 기준

1. `SESSION_SECRET` 없이 `session.ts` 를 import 해도 throw 하지 않는다. `signSession` 과 `verifySession` 을 부를 때 `SESSION_SECRET is not set` 으로 throw 한다(조용히 null 을 돌려주지 않는다).
2. `SESSION_SECRET` 없이 `npm run build` 가 통과한다.
3. 기존 session 테스트 5개가 그대로 통과한다.
4. 머지 뒤 Production 배포가 성공한다(`gh api .../deployments` 상태 success).
5. `ARCHITECTURE.md` env 표의 `SESSION_SECRET` 행이 새 동작("없으면 로그인과 검증 호출 때 throw, 빌드는 통과")을 적는다.

## 남길 수치

| 수치                  | 전   | 후   | 측정 방법                                            |
| --------------------- | ---- | ---- | ---------------------------------------------------- |
| Vercel 배포 연속 실패 | 7    | 0    | `gh api repos/OhChangEun/4ever-erp/deployments` 상태 |
| env 없이 빌드         | 실패 | 통과 | `env -u SESSION_SECRET npm run build`                |

## 결정 질문 (게이트 1)

AI 가 정했다(사용자 "더 안 건드린다", "Vercel 실패도 확인해줘").

1. Vercel 환경변수는 AI 가 생성해 넣는다. 세션 서명용 난수라 사용자 개인 자격증명이 아니고, `vercel env rm` 뒤 다시 넣으면 교체된다. 값은 채팅과 문서 어디에도 남기지 않는다.
2. 비밀키가 없을 때 `verifySession` 은 null 이 아니라 throw. null 이면 "로그인이 풀렸다"로 보여 설정 오류를 숨긴다(우선순위 2).
3. Vercel 체크를 필수로 올리지 않는다. preview 는 env 외 이유(한도 등)로도 실패할 수 있어 머지를 막으면 과하다. 대신 이 카드처럼 빌드가 env 에 안 묶이게 한다.

## 테스트 (2단계)

| 완료 기준 | 테스트 파일                                | 내용                                                                                      |
| --------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1         | `src/lib/auth/session.test.ts`             | env 지우고 `vi.resetModules()` 뒤 import 성공, `signSession` 과 `verifySession` 이 reject |
| 2         | 로컬 `env -u SESSION_SECRET npm run build` |                                                                                           |
| 3         | 기존 5개                                   |                                                                                           |

## 전후 표 (3단계)

| 항목                     | 전                                                       | 후                                   | 측정 방법                                                 |
| ------------------------ | -------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------- |
| env 없이 `npm run build` | 실패 (`Failed to collect page data for /api/auth/login`) | 통과                                 | `.env.local` 치우고 `env -u SESSION_SECRET npm run build` |
| 비밀키 읽는 시점         | import                                                   | `signSession`, `verifySession` 호출  | 테스트 1개                                                |
| Vercel env               | 0개                                                      | `SESSION_SECRET` Production, Preview | `vercel env ls`                                           |

## 별도 보고

- `vercel link` 가 `.gitignore` 에 `.vercel` 을 추가했다. 이 PR 에 포함.
- Vercel 프로젝트에 `BACKEND_API_URL` 도 없다. 의도대로 서버 목으로 돈다.

## 리뷰 (4단계)

`ai/reviews/2026-11-09_배포_SESSION_SECRET.md`. P0~P3 전부 0.

## findings (5단계)

| 완료 기준 | 결과 | 확인 방법 | 비고 |
| --------- | ---- | --------- | ---- |

## 결과 (6단계)

PR #5 (2026-11-09 머지). 완료 기준 5개 전부 통과. 수치 후보: Vercel 배포 연속 실패 7 → 0. 블로그 소재: "빌드 시점 env throw 가 배포를 조용히 7번 죽인 이야기" (CI 는 더미 값으로 초록이었음). 거절한 제안 없음.
