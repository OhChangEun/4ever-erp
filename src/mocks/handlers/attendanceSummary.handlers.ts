import { createOpenApiHttp } from 'openapi-msw';
import type { paths } from '@/lib/api/openapi.gen';
import { API_BASE_URL } from '@/app/types/api';
import { addDays, todayKey } from './seed';
import { shouldError } from './utils';

/**
 * 날짜별 근태 집계 목(시각화 5). 새 핸들러라 openapi-msw 로 쓴다(결정 기록 OpenAPI 계약 2).
 * 오늘(한국 날짜)에서 끝나는 12주의 근무일(월~금). 12주 창은 날짜를 고르기만 하고 값은 그 날짜로 정한다(카드 "날짜가
 * 지나도 같은 데모 데이터"). 매월 22~28일에 지각이 몰린다.
 */
const http = createOpenApiHttp<paths>({ baseUrl: API_BASE_URL });

const WEEKS = 12;
/** 회사 인원. 인사와 대시보드 통계의 직원 수도 이 값이다 */
export const HEADCOUNT = 40;

const dayOf = (date: string) => {
  const day = new Date(date);
  // 1970-01-01(목)에서 센 날 수
  const n = day.getTime() / 86_400_000;
  const busy = day.getUTCDate() >= 22 && day.getUTCDate() <= 28;
  const late = busy ? 3 + (n % 3) : n % 4 === 1 ? 1 : n % 7 === 4 ? 2 : 0;
  const absent = n % 9 === 0 ? 1 : 0;
  const onLeave = n % 6 === 0 ? 2 : 0;
  return {
    date,
    headcount: HEADCOUNT,
    present: HEADCOUNT - late - absent - onLeave,
    late,
    absent,
    onLeave,
  };
};

/** from~to(양끝 포함) 근무일의 근태 */
export const attendanceBetween = (from: string, to: string) => {
  const days = [];
  for (let date = from; date <= to; date = addDays(date, 1))
    if (![0, 6].includes(new Date(date).getUTCDay())) days.push(dayOf(date));
  return days;
};

export const attendanceDays = (today = todayKey()) => {
  const from = addDays(today, -(WEEKS * 7 - 1));
  return { from, to: today, days: attendanceBetween(from, today) };
};

export const attendanceSummaryHandlers = [
  http.get('/business/hrm/attendance/daily-summary', ({ request, response }) => {
    if (shouldError(request))
      return response('default').json(
        { status: 500, success: false, message: 'Failed to load attendance summary' },
        { status: 500 },
      );
    return response(200).json({
      status: 200,
      success: true,
      message: 'OK',
      data: attendanceDays(),
    });
  }),
];
