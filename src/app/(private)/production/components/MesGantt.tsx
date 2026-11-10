'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ganttLayout, type GanttRow } from '../gantt';

const ROW = 32;
const LABEL_W = 180; // 왼쪽 번호, 품목 칸
const CHART_W = 640;
const AXIS_H = 22;

/**
 * MES 작업지시 간트(시각화 3). 계산은 ganttLayout(D3 scale), 그리기는 React.
 * 막대 목록은 role=list, 막대는 listitem. roving tabindex 로 막대 하나만 Tab 에 들어오고
 * 위아래 화살표, Home/End 로 옮긴다. Enter, Space 는 상세(onSelect).
 * 지연은 빨간 테두리와 "지연" 글자로 함께 보인다(색만으로 말하지 않는다).
 */
export default function MesGantt({
  rows,
  today = new Date(),
  onSelect,
}: {
  rows: readonly GanttRow[];
  today?: Date;
  onSelect: (mesId: string) => void;
}) {
  const t = useTranslations('production.gantt');
  const layout = ganttLayout(rows, { today, width: CHART_W, rowHeight: ROW });
  const [focused, setFocused] = useState(0);
  const [moved, setMoved] = useState(false);
  const itemRefs = useRef<(SVGGElement | null)[]>([]);
  const clipId = useId();

  // 키보드로 옮긴 막대에 실제 포커스(그린 뒤에)
  useEffect(() => {
    if (moved) itemRefs.current[focused]?.focus();
  }, [focused, moved]);

  const last = layout.bars.length - 1;
  // 필터나 페이지가 바뀌어 줄이 줄어도 Tab 으로 들어올 막대가 하나는 있게 자른다(리뷰 P2)
  const active = Math.min(focused, Math.max(0, last));
  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, index: number, id: string) => {
    const next: Partial<Record<string, number>> = {
      ArrowDown: Math.min(last, index + 1),
      ArrowUp: Math.max(0, index - 1),
      Home: 0,
      End: last,
    };
    const target = next[event.key];
    if (target !== undefined) {
      event.preventDefault();
      setFocused(target);
      setMoved(true);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(id);
    }
  };

  const height = layout.height + AXIS_H;

  return (
    <div className="overflow-x-auto">
      <svg
        width={LABEL_W + CHART_W}
        height={height}
        viewBox={`0 0 ${LABEL_W + CHART_W} ${height}`}
        className="text-gray-700"
      >
        {/* 왼쪽 이름 칸을 넘는 글자는 자른다. 전체 이름은 막대의 접근성 이름에 있다(리뷰 P2) */}
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={LABEL_W - 8} height={ROW} />
          </clipPath>
        </defs>

        {/* 날짜 눈금과 세로 격자 */}
        <g transform={`translate(${LABEL_W}, 0)`} aria-hidden="true">
          {layout.ticks.map((t) => (
            <g key={t.label + t.x} transform={`translate(${t.x}, 0)`}>
              <line y1={AXIS_H - 4} y2={height} className="stroke-gray-100" />
              <text y={12} textAnchor="middle" className="fill-gray-500 text-[11px] tabular-nums">
                {t.label}
              </text>
            </g>
          ))}
          <line
            x1={layout.todayX}
            x2={layout.todayX}
            y1={AXIS_H - 6}
            y2={height}
            className="stroke-blue-500"
            strokeDasharray="3 3"
          />
          <text x={layout.todayX + 4} y={AXIS_H - 8} className="fill-blue-600 text-[11px]">
            {t('today')}
          </text>
        </g>

        <g role="list" aria-label={t('listLabel')} transform={`translate(0, ${AXIS_H})`}>
          {layout.bars.map((bar, i) => {
            const row = rows[i];
            const name = t(bar.delayed ? 'barDelayed' : 'bar', {
              number: row.mesNumber,
              product: row.productName,
              start: row.startDate,
              end: row.endDate,
              // 숫자 형식(쉼표, 소수 자르기)을 타지 않게 글자로 넘긴다. 예전 이름과 같은 값
              progress: String(bar.progress),
            });
            return (
              <g
                key={bar.id}
                ref={(node) => {
                  itemRefs.current[i] = node;
                }}
                role="listitem"
                aria-label={name}
                tabIndex={i === active ? 0 : -1}
                onKeyDown={(e) => handleKeyDown(e, i, bar.id)}
                onFocus={() => setFocused(i)}
                onClick={() => onSelect(bar.id)}
                transform={`translate(0, ${bar.y})`}
                className="cursor-pointer outline-none focus-visible:[&>rect.track]:stroke-blue-500 focus-visible:[&>rect.track]:stroke-2"
              >
                <text
                  x={0}
                  y={ROW / 2 + 4}
                  clipPath={`url(#${clipId})`}
                  className="fill-gray-900 text-[12px] tabular-nums"
                >
                  {row.mesNumber}
                  <tspan className="fill-gray-500"> {row.productName}</tspan>
                </text>
                <rect
                  className={`track ${bar.delayed ? 'stroke-red-500' : 'stroke-gray-200'} fill-gray-100`}
                  x={LABEL_W + bar.x}
                  y={6}
                  width={bar.width}
                  height={ROW - 12}
                  rx={3}
                  strokeWidth={bar.delayed ? 1.5 : 1}
                />
                <rect
                  className="fill-blue-500"
                  x={LABEL_W + bar.x}
                  y={6}
                  width={bar.progressWidth}
                  height={ROW - 12}
                  rx={3}
                />
                {bar.delayed && (
                  <text
                    x={LABEL_W + bar.x + bar.width + 6}
                    y={ROW / 2 + 4}
                    className="fill-red-600 text-[11px] font-medium"
                  >
                    {t('delayed')}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
