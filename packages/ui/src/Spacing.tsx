/** 지원하는 여백 크기. 표에 없는 숫자를 넘기면 타입 검사에서 걸린다(예전엔 아무 숫자나 받고 실행 때 경고만 했다) */
export type SpacingSize = 2 | 3 | 4 | 6 | 8 | 10 | 12 | 16 | 20 | 24;

interface SpacingProps {
  size?: SpacingSize;
  direction?: 'vertical' | 'horizontal';
  className?: string;
}

const spacingClassMap: Record<SpacingSize, { h: string; w: string }> = {
  2: { h: 'h-2', w: 'w-2' },
  3: { h: 'h-3', w: 'w-3' },
  4: { h: 'h-4', w: 'w-4' },
  6: { h: 'h-6', w: 'w-6' },
  8: { h: 'h-8', w: 'w-8' },
  10: { h: 'h-10', w: 'w-10' },
  12: { h: 'h-12', w: 'w-12' },
  16: { h: 'h-16', w: 'w-16' },
  20: { h: 'h-20', w: 'w-20' },
  24: { h: 'h-24', w: 'w-24' },
};

/**
 * Spacing 컴포넌트 - 순순한 여백 요소
 * @example
 * <div>Item 1</div>
 * <Spacing size={12} />
 * <div>Item 2</div>
 */
export default function Spacing({
  size = 4,
  direction = 'vertical',
  className = '',
}: SpacingProps) {
  const spacing = spacingClassMap[size];

  const dimensionClass = direction === 'vertical' ? spacing.h : spacing.w;
  return <div className={`${dimensionClass} ${className}`} />;
}
