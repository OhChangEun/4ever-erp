interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'whiteOutline' | 'ghost' | 'soft' | 'green';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 아이콘 버튼. label 이 없으면 정사각형이며, 이때는 aria-label 을 반드시 넘긴다.
 * 색·크기 체계는 Button 과 같다.
 */
export default function IconButton({
  label,
  icon,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap cursor-pointer transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50';

  const variants = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100',
    outline: 'border border-blue-500 text-blue-600 bg-white hover:bg-blue-50',
    whiteOutline: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
    soft: 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100',
    green: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700',
  };

  const sizes = {
    sm: { pad: 'px-2.5', text: 'text-[13px]', square: 'w-8', height: 'h-8', icon: 'text-sm' },
    md: { pad: 'px-3', text: 'text-sm', square: 'w-9', height: 'h-9', icon: 'text-base' },
    lg: { pad: 'px-4', text: 'text-sm', square: 'w-10', height: 'h-10', icon: 'text-lg' },
  };

  const isIconOnly = !label;
  const s = sizes[size];

  return (
    <button
      type={type}
      className={`${base} ${s.height} ${isIconOnly ? s.square : s.pad} ${s.text} ${variants[variant]} ${className}`}
      {...props}
    >
      <i aria-hidden="true" className={`${icon} ${s.icon}`}></i>
      {label && <span>{label}</span>}
    </button>
  );
}
