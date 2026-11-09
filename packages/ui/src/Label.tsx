import { ReactNode } from 'react';

type LabelVariant = 'solid' | 'ghost' | 'outline';
type LabelColor = 'blue' | 'green' | 'red' | 'gray' | 'white';
type LabelSize = 'xs' | 'sm';

interface LabelProps {
  children: ReactNode;
  variant?: LabelVariant;
  color?: LabelColor;
  size?: LabelSize;
  className?: string;
}

const solidMap: Record<LabelColor, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-600',
  gray: 'bg-gray-100 text-gray-600',
  white: 'bg-white text-gray-700',
};

const ghostMap: Record<LabelColor, string> = {
  blue: 'bg-blue-500/20 text-white',
  green: 'bg-green-500/20 text-white',
  red: 'bg-red-500/20 text-white',
  gray: 'bg-gray-500/20 text-white',
  white: 'bg-white/20 text-white',
};

const outlineMap: Record<LabelColor, string> = {
  blue: 'border border-blue-300 text-blue-600',
  green: 'border border-green-300 text-green-600',
  red: 'border border-red-300 text-red-600',
  gray: 'border border-gray-300 text-gray-600',
  white: 'border border-white/50 text-white',
};

const sizeMap: Record<LabelSize, string> = {
  xs: 'text-xs px-2 py-0.5',
  sm: 'text-sm px-2.5 py-1',
};

/**
 * 범용 라벨/뱃지 컴포넌트
 * @example
 * <Label color="green">완료</Label>
 * <Label variant="ghost" color="white">PASS</Label>
 * <Label variant="outline" color="red" size="sm">조달 필요</Label>
 */
export default function Label({
  children,
  variant = 'solid',
  color = 'gray',
  size = 'xs',
  className = '',
}: LabelProps) {
  const variantClass =
    variant === 'ghost'
      ? ghostMap[color]
      : variant === 'outline'
        ? outlineMap[color]
        : solidMap[color];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full whitespace-nowrap ${sizeMap[size]} ${variantClass} ${className}`}
    >
      {children}
    </span>
  );
}
