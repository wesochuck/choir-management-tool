import type { ComponentPropsWithoutRef } from 'react';

export interface SelectProps extends ComponentPropsWithoutRef<'select'> {
  invalid?: boolean;
}

export function Select({ invalid, className, ...rest }: SelectProps) {
  const classNames = [
    'appearance-none h-[44px] pl-3 pr-9 border border-border rounded-md text-sm text-text bg-surface cursor-pointer outline-none transition-[border-color,box-shadow,background-color] duration-200 w-full disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary hover:bg-primary-light focus:border-primary focus:shadow-[0_0_0_3px_rgba(74,124,89,0.25)]',
    invalid && 'border-danger-text focus:shadow-[0_0_0_3px_rgba(153,27,27,0.25)]',
    className,
  ].filter(Boolean).join(' ');
  return (
    <select
      className={classNames}
      // @allow-inline-style - SVG chevron icon for select
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '14px 14px' }}
      {...rest}
    />
  );
}
