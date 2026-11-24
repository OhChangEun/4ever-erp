import { mockState } from '../state';
import { seedQuotes, todayKey, type SeedQuote } from './seed';

/**
 * 그 로그인의 견적 씨앗과 기준일. 견적이 나오는 목(영업, 생산, 알림, 대시보드)은 모두 여기서 읽는다. 기준일이 하나라
 * 도메인을 서로 다른 날 처음 열어도, 자정이 지나도 같은 견적이다. MRP 조달 날짜와 MES 기간도 이 날에서 센다
 */
// shortcut: 기준일은 로그인이 끝날 때까지 안 바뀐다. 몇 주 켜 둔 브라우저 MSW(개발용)에서는 견적이 오래되고 MPS 수요가 0 이 될 수 있다, 서버 목은 세션이 하루라 안 생긴다
const quoteState = mockState<{ from: string; quotes: SeedQuote[] }>(() => {
  const from = todayKey();
  return { from, quotes: seedQuotes(from) };
});

/** 그 로그인이 견적이 든 목을 처음 부른 날(한국 날짜) */
export const quotesFrom = (request: Request) => quoteState(request).from;
/** 그 로그인의 기본 견적 16건(qt-001~016 순). 받은 행을 고치지 않는다 */
export const seedQuotesOf = (request: Request) => quoteState(request).quotes;
export const seedQuoteOf = (request: Request, quotationId: string) =>
  seedQuotesOf(request).find(({ quote }) => quote.quotationId === quotationId);
