export type SpacingSize = number;

interface SpacingProps {
  size?: number;
  direction?: 'vertical' | 'horizontal';
  className?: string;
}

const spacingClassMap: Record<number, { h: string; w: string }> = {
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

const directionMap = {
  vertical: 'flex flex-col',
  horizontal: 'flex flex-row',
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
  if (!spacing) {
    console.warn(
      `Spacing size ${size}은 지원하지 않습니다. 지원 값: ${Object.keys(spacingClassMap).join(', ')}`,
    );
    return null;
  }

  const dimensionClass = direction === 'vertical' ? spacing.h : spacing.w;
  return <div className={`${dimensionClass} ${className}`} />;
}
