import { HTMLAttributes, ReactNode } from 'react';

type FlexDirection = 'row' | 'col' | 'row-reverse' | 'col-reverse';
type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
type FlexGap = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;

interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  direction?: FlexDirection;
  align?: FlexAlign;
  justify?: FlexJustify;
  gap?: FlexGap;
  wrap?: boolean;
  flex1?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const directionMap: Record<FlexDirection, string> = {
  row: 'flex-row',
  col: 'flex-col',
  'row-reverse': 'flex-row-reverse',
  'col-reverse': 'flex-col-reverse',
};

const alignMap: Record<FlexAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const justifyMap: Record<FlexJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

const gapMap: Record<FlexGap, string> = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
};

/**
 * Flex 레이아웃 공통 컴포넌트
 * @example
 * <Flex align="center" justify="between" gap={4}>
 *   <span>Left</span>
 *   <span>Right</span>
 * </Flex>
 */
export default function Flex({
  direction = 'row',
  align,
  justify,
  gap,
  wrap,
  flex1,
  fullWidth,
  className = '',
  children,
  ...rest
}: FlexProps) {
  const classes = [
    'flex',
    directionMap[direction],
    align ? alignMap[align] : '',
    justify ? justifyMap[justify] : '',
    gap ? gapMap[gap] : '',
    wrap ? 'flex-wrap' : '',
    flex1 ? 'flex-1' : '',
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
