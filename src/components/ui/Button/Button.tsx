import type { ElementType, MouseEventHandler, ReactNode } from 'react';
import SlButton from '@shoelace-style/shoelace/dist/react/button/index.js';
import { Spinner } from '../Spinner/Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'default' | 'small' | 'tiny';

export interface ButtonProps {
  as?: ElementType;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-surface hover:bg-primary-deep hover:shadow-md',
  secondary: 'bg-primary-light text-primary-deep hover:bg-primary-deep/10',
  outline:
    'bg-transparent text-text-muted border-border hover:bg-primary-light hover:text-primary-deep',
  danger: 'bg-danger-bg text-danger-text hover:bg-red-200 hover:border-red-300',
  ghost: 'bg-transparent text-text-muted border-transparent hover:text-primary-deep',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-11 px-6 text-sm',
  small: 'h-8 px-4 text-xs',
  tiny: 'h-6 px-2 text-[11px] gap-1',
};

export function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'default',
  loading = false,
  icon,
  children,
  className,
  disabled,
  onClick,
  ...rest
}: ButtonProps & Record<string, unknown>) {
  const isButton = Component === 'button';

  if (process.env.NODE_ENV === 'test' || !isButton) {
    const classNames = [
      'inline-flex items-center justify-center rounded-md font-sans font-medium',
      'border border-transparent cursor-pointer transition-all gap-2 whitespace-nowrap',
      'disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px',
      variantClasses[variant],
      sizeClasses[size],
      className,
    ].join(' ');

    return (
      <Component
        className={classNames}
        disabled={isButton ? disabled || loading : undefined}
        onClick={loading ? undefined : onClick}
        {...rest}
      >
        {loading && <Spinner size="small" />}
        {!loading && icon}
        {children}
      </Component>
    );
  }

  const slVariant =
    variant === 'secondary' || variant === 'ghost'
      ? 'neutral'
      : variant === 'danger'
        ? 'danger'
        : 'primary';
  const slSize = size === 'tiny' || size === 'small' ? 'small' : 'medium';
  const isOutline = variant === 'outline';

  const slProps: Record<string, unknown> = {
    variant: slVariant,
    size: slSize,
    outline: isOutline,
    loading,
    onClick,
  };
  if (disabled !== undefined) slProps.disabled = disabled;
  if (className !== undefined) slProps.className = className;
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) slProps[key] = value;
  }

  return (
    <SlButton {...slProps}>
      {icon && <span slot="prefix">{icon}</span>}
      {children}
    </SlButton>
  );
}
