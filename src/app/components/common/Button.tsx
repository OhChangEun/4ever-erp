interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'whiteOutline' | 'ghost' | 'soft' | 'green';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
}

export default function Button({
  label,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  const base = 'rounded-lg focus:outline-none transition cursor-pointer whitespace-nowrap';

  const variants = {
    primary: 'bg-blue-500 font-semibold text-white hover:opacity-85',
    secondary: 'bg-gray-100 font-medium text-gray-700 hover:bg-gray-200',
    outline: 'font-normal border border-blue-400 text-blue-500 bg-transparent hover:bg-blue-100',
    whiteOutline: 'bg-white font-normal border border-gray-300 text-gray-500/70 hover:bg-gray-50',
    ghost: 'bg-transparent text-blue-600 hover:bg-blue-100',
    soft: 'bg-blue-100 font-medium text-blue-500 hover:bg-blue-200/70',
    green: 'bg-green-500 font-semibold text-white hover:bg-green-600',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-3 text-lg',
  };

  const variantClasses = 'bg-gray-400 text-gray-800 opacity-30 pointer-events-none'; // disabled용 배경/텍스트

  return (
    <button
      className={`
        ${base}
        ${sizes[size]}       
        ${props.disabled ? variantClasses : variants[variant]} 
        ${className}`}
      {...props}
    >
      {label}
    </button>
  );
}
