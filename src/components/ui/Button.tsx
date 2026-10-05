import { CircularProgress } from '@mui/material';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'dark' | 'outline' | 'success' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-pa-blue text-white border border-pa-blue hover:bg-[#1f7ff0]',
  dark: 'bg-ink text-white border border-ink hover:bg-[#1c1c1c]',
  outline: 'bg-white text-body border border-line-strong hover:border-ink',
  success: 'bg-pa-green text-white border border-pa-green hover:bg-[#12a554]',
  danger: 'bg-white text-pa-red border border-line-strong hover:border-pa-red',
  link: 'bg-transparent border-0 text-pa-blue hover:text-pa-blue-dark normal-case tracking-normal font-medium px-0',
};

const SIZES: Record<Size, string> = {
  sm: 'px-[11px] py-[5px] text-[11px] font-medium normal-case tracking-normal',
  md: 'px-4 py-[9px] text-[11px] font-semibold uppercase tracking-[1.2px]',
  lg: 'px-[18px] py-[11px] text-[11px] font-semibold uppercase tracking-[1.2px]',
};

/** Class list for a button look - also used for links styled as buttons. */
export function buttonClasses(
  variant: Variant = 'outline',
  size: Size = 'md',
  block = false,
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none transition-[background-color,border-color,color] duration-150 cursor-pointer',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    variant !== 'link' && SIZES[size],
    variant === 'link' && 'text-[12px]',
    block && 'w-full',
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  icon?: ReactNode;
}

/** The prototype's square, uppercase, tracked buttons. */
export function Button({
  variant = 'outline',
  size = 'md',
  loading,
  block,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, block, className)}
      {...rest}
    >
      {loading ? <CircularProgress size={12} color="inherit" thickness={5} /> : icon}
      {children}
    </button>
  );
}
