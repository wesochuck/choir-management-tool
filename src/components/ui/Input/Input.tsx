import type { ComponentPropsWithoutRef } from 'react';

export interface InputProps extends ComponentPropsWithoutRef<'input'> {
  invalid?: boolean;
}

export function Input({ invalid, className, ...rest }: InputProps) {
  const classNames = [
    'h-[44px] px-3 border border-border rounded-md text-sm text-text bg-surface outline-none transition-[border-color,box-shadow] duration-200 w-full disabled:opacity-50 disabled:cursor-not-allowed focus:border-primary focus:shadow-[0_0_0_3px_rgba(74,124,89,0.25)]',
    invalid && 'border-danger-text focus:shadow-[0_0_0_3px_rgba(153,27,27,0.25)]',
    className,
  ].filter(Boolean).join(' ');
  return <input className={classNames} {...rest} />;
}
