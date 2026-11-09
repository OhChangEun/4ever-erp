'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IconButton } from '@everp/ui';
import { addDays, addMonths, isSameDay, startOfDay, toDateKey } from '@/app/utils/date';

interface CalendarGridProps {
  /** 선택한 날짜(현지 자정). 없으면 오늘이 있는 달을 보여준다 */
  value: Date | null;
  onSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = Array.from({ length: 12 }, (_, i) => i);

/** 날(day)을 유지하며 연, 월을 바꾼다. 그 달에 없는 날이면 말일로 */
const withYearMonth = (date: Date, year: number, month: number) => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(date.getDate(), lastDay));
};

const monthLabel = (date: Date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
const dayLabel = (date: Date) =>
  `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일`;

/** 그 달의 첫 주 일요일부터 6주(42칸). 다른 달의 날은 null 로 비운다 */
const monthCells = (month: Date): (Date | null)[] => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const day = addDays(start, i);
    return day.getMonth() === month.getMonth() ? day : null;
  });
};

/**
 * 한 달 달력 격자(성능 2 카드에서 MUI StaticDatePicker 를 대신함).
 * 날짜는 모두 현지 자정 Date 로 다룬다. 문자열로 바꿀 땐 toDateKey(현지 YYYY-MM-DD)만 쓴다.
 * 키보드: 화살표(하루, 한 주), Home/End(주의 처음, 끝), PageUp/PageDown(한 달), Enter/Space(선택).
 * 포커스는 roving tabindex 로 한 칸만 Tab 으로 들어온다.
 */
export default function CalendarGrid({ value, onSelect, minDate, maxDate }: CalendarGridProps) {
  const min = minDate ? startOfDay(minDate) : null;
  const max = maxDate ? startOfDay(maxDate) : null;
  const today = startOfDay(new Date());

  // 포커스 날짜는 늘 범위 안. 비활성 칸으로 가면 DOM 포커스와 내부 값이 어긋난다(리뷰 지적 P2)
  const clamp = (date: Date) => (min && date < min ? min : max && date > max ? max : date);
  const [focused, setFocusedRaw] = useState<Date>(() => clamp(value ?? today));
  const setFocused = (date: Date) => setFocusedRaw(clamp(date));
  const viewMonth = new Date(focused.getFullYear(), focused.getMonth(), 1);
  const gridRef = useRef<HTMLDivElement>(null);
  const [focusRequested, setFocusRequested] = useState(false);

  const isDisabled = (date: Date) => (min !== null && date < min) || (max !== null && date > max);

  // 키보드로 옮긴 칸에 실제 DOM 포커스를 준다(그리기 뒤에 해야 해서 effect)
  useEffect(() => {
    if (!focusRequested) return;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`button[data-date="${toDateKey(focused)}"]`)
      ?.focus();
  }, [focused, focusRequested]);

  const moveFocus = (next: Date) => {
    setFocused(next);
    setFocusRequested(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Partial<Record<string, () => Date>> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -focused.getDay()),
      End: () => addDays(focused, 6 - focused.getDay()),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveFocus(move());
  };

  const firstYear = (min ?? new Date(1940, 0, 1)).getFullYear();
  const lastYear = (max ?? new Date(today.getFullYear() + 10, 0, 1)).getFullYear();
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);

  const prevMonthLast = addDays(viewMonth, -1);
  const nextMonthFirst = addMonths(viewMonth, 1);
  const cells = monthCells(viewMonth);

  return (
    <div className="p-3 w-[280px] select-none">
      <div className="flex items-center justify-between mb-2">
        <IconButton
          type="button"
          icon="ri-arrow-left-s-line"
          size="sm"
          variant="ghost"
          aria-label="이전 달"
          disabled={min !== null && prevMonthLast < min}
          onClick={() => setFocused(addMonths(focused, -1))}
        />
        {/* 연도와 월을 바로 고른다. 생년월일처럼 먼 날짜를 한 달씩 넘기지 않게(리뷰 지적 P2) */}
        <div className="flex items-center gap-1" aria-live="polite">
          <select
            aria-label="연도"
            value={viewMonth.getFullYear()}
            onChange={(e) =>
              setFocused(withYearMonth(focused, Number(e.target.value), focused.getMonth()))
            }
            className="h-8 rounded-md border border-gray-200 bg-white px-1.5 text-sm font-semibold text-gray-900 tabular-nums"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>
          <select
            aria-label="월"
            value={viewMonth.getMonth()}
            onChange={(e) =>
              setFocused(withYearMonth(focused, focused.getFullYear(), Number(e.target.value)))
            }
            className="h-8 rounded-md border border-gray-200 bg-white px-1.5 text-sm font-semibold text-gray-900 tabular-nums"
          >
            {MONTHS.map((month) => (
              <option key={month} value={month}>
                {month + 1}월
              </option>
            ))}
          </select>
        </div>
        <IconButton
          type="button"
          icon="ri-arrow-right-s-line"
          size="sm"
          variant="ghost"
          aria-label="다음 달"
          disabled={max !== null && nextMonthFirst > max}
          onClick={() => setFocused(addMonths(focused, 1))}
        />
      </div>

      <div ref={gridRef} role="grid" aria-label={monthLabel(viewMonth)}>
        <div role="row" className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((weekday) => (
            <span
              key={weekday}
              role="columnheader"
              aria-label={`${weekday}요일`}
              className="text-center text-xs text-gray-500 py-1"
            >
              {weekday}
            </span>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, week) => (
          <div key={week} role="row" className="grid grid-cols-7">
            {cells.slice(week * 7, week * 7 + 7).map((day, i) => {
              if (!day) return <span key={i} role="gridcell" />;
              const selected = value !== null && isSameDay(day, value);
              const isToday = isSameDay(day, today);
              const disabled = isDisabled(day);
              return (
                <span key={i} role="gridcell" aria-selected={selected}>
                  <button
                    type="button"
                    data-date={toDateKey(day)}
                    aria-label={dayLabel(day)}
                    aria-current={isToday ? 'date' : undefined}
                    tabIndex={isSameDay(day, focused) ? 0 : -1}
                    disabled={disabled}
                    onClick={() => onSelect(day)}
                    onKeyDown={handleKeyDown}
                    className={`w-9 h-9 mx-auto flex items-center justify-center rounded-md text-[13px] tabular-nums transition-colors
                      ${selected ? 'bg-blue-500 text-white font-medium' : isToday ? 'text-blue-600 font-semibold hover:bg-gray-100' : 'text-gray-800 hover:bg-gray-100'}
                      disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500`}
                  >
                    {day.getDate()}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
