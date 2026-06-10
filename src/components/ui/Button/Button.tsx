import type { ElementType, MouseEventHandler, ReactNode } from 'react';
import { Spinner } from '../Spinner/Spinner';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'default' | 'small';

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
  const classNames = [styles.btn, styles[variant]]
    .concat(size !== 'default' ? [styles.small] : [])
    .concat(className ? [className] : [])
    .join(' ');

  const isButton = Component === 'button';

  return (
    <Component
      className={classNames}
      disabled={isButton ? (disabled || loading) : undefined}
      onClick={loading ? undefined : onClick}
      {...rest}
    >
      {loading && <Spinner size="small" />}
      {!loading && icon}
      {children}
    </Component>
  );
}
