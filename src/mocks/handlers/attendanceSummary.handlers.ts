import { createOpenApiHttp } from 'openapi-msw';
import type { paths } from '@/lib/api/openapi.gen';
import { API_BASE_URL } from '@/app/types/api';
import { addDays, startOfDay, toDateKey } from '@/app/utils/date';
import { shouldError } from './utils';

/**
 * 날짜별 근태 집계 목(시각화 5). 새 핸들러라 openapi-msw 로 쓴다(결정 기록 OpenAPI 계약 2).
 * 오늘에서 끝나는 12주의 근무일(월~금). 값은 날 순번으로 정해져 결정적이고, 3주 전 주에 지각이 몰린다.
 */
const http = createOpenApiHttp<paths>({ baseUrl: API_BASE_URL });

const WEEKS = 12;
const HEADCOUNT = 40;

export const attendanceDays = (today = new Date()) => {
  const end = startOfDay(today);
  const start = addDays(end, -(WEEKS * 7 - 1));
  const days = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const date = addDays(start, i);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;
    const daysAgo = WEEKS * 7 - 1 - i;
    const busyWeek = daysAgo >= 15 && daysAgo <= 21;
    const late = busyWeek ? 3 + (i % 3) : i % 4 === 1 ? 1 : i % 7 === 3 ? 2 : 0;
    const absent = i % 9 === 0 ? 1 : 0;
    const onLeave = i % 6 === 0 ? 2 : 0;
    days.push({
      date: toDateKey(date),
      headcount: HEADCOUNT,
      present: HEADCOUNT - late - absent - onLeave,
      late,
      absent,
      onLeave,
    });
  }
  return { from: toDateKey(start), to: toDateKey(end), days };
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
