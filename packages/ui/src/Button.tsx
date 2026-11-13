interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'whiteOutline' | 'ghost' | 'soft' | 'green';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  /** 요청 진행 중. 클릭을 막고 스피너를 보여준다. */
  loading?: boolean;
}

/**
 * 버튼. 한 영역에 primary 는 하나만.
 * primary = 핵심 액션 / secondary = 보조 / ghost = 테이블 안 텍스트 액션
 */
export default function Button({
  label,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  type = 'button',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50';

  const variants = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100',
    outline: 'border border-blue-500 text-blue-600 bg-white hover:bg-blue-50',
    whiteOutline: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'bg-transparent text-blue-600 hover:bg-blue-50 active:bg-blue-100',
    soft: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    green: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700',
  };

  const sizes = {
    sm: 'h-8 px-3 text-[13px]',
    md: 'h-9 px-3.5 text-sm',
    lg: 'h-10 px-4 text-sm',
  };

  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
      disabled={props.disabled || loading}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
        />
      )}
      {label}
    </button>
  );
}
