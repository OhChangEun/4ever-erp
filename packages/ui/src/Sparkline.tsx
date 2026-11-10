'use client';

import { useUiText } from './UiText';

interface SparklineProps {
  /** 시간 순서의 값. 마지막이 지금 값 */
  data: readonly number[];
  /** 화면 낭독기가 읽을 이름. 시작, 끝, 최저, 최고 요약이 뒤에 붙는다 */
  label: string;
  width?: number;
  height?: number;
}

const format = (n: number) => n.toLocaleString('ko-KR');

/**
 * 축 없는 작은 꺾은선(시각화 1). 라이브러리 없이 SVG 한 장.
 * 색은 회색 하나, 마지막 점만 브랜드 색(DESIGN_GUIDELINES 12장 허용 차트).
 * 점이 2개 미만이면 그리지 않는다. 추이 없이 그래프를 그리지 않는다.
 */
export default function Sparkline({ data, label, width = 64, height = 20 }: SparklineProps) {
  const text = useUiText().sparkline;
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // 값이 모두 같으면 가운데 한 줄
  const pad = 2;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (data.length - 1);
  const y = (v: number) =>
    max === min ? height / 2 : pad + ((max - v) * (height - pad * 2)) / range;
  const points = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = data.length - 1;
  const summary = text.summary(label, {
    start: format(data[0]),
    end: format(data[last]),
    min: format(min),
    max: format(max),
  });

  return (
    <svg
      role="img"
      aria-label={summary}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible text-gray-400"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={x(last)} cy={y(data[last])} r={2} className="fill-blue-500" />
    </svg>
  );
}
