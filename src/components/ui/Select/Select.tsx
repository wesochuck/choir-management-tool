import type { ComponentPropsWithoutRef } from 'react';

export type SelectSize = 'default' | 'small' | 'compact';

export interface SelectProps extends ComponentPropsWithoutRef<'select'> {
  invalid?: boolean;
  /** @default 'default' */
  size?: SelectSize;
  /** Visually hidden — strips all chrome. Use for overlay pickers. */
  visuallyHidden?: boolean;
}

const sizeClasses: Record<SelectSize, string> = {
  default: 'h-[44px] pl-3 pr-9 py-2 text-sm',
  small: 'h-10 pl-3 pr-9 py-1.5 text-sm',
  compact: 'h-8 pl-2 pr-7 py-0.5 text-xs',
};

export function Select({ invalid, size = 'default', visuallyHidden = false, className, ...rest }: SelectProps) {
  const classNames = [
    'appearance-none border border-border rounded-md text-text bg-surface cursor-pointer outline-none transition-[border-color,box-shadow,background-color] duration-200 w-full disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary hover:bg-primary-light focus:border-primary focus:shadow-[0_0_0_3px_rgba(74,124,89,0.25)]',
    sizeClasses[size],
    invalid && 'border-danger-text focus:shadow-[0_0_0_3px_rgba(153,27,27,0.25)]',
    visuallyHidden && '!absolute !inset-0 !size-full !cursor-pointer !opacity-0 !border-none !bg-transparent !p-0 hover:!bg-transparent focus:!shadow-none',
    className,
  ].filter(Boolean).join(' ');
  return (
    <select
      className={classNames}
      {...rest}
      // @allow-inline-style - SVG data URI background cannot be Tailwind
      style={{
        backgroundImage: visuallyHidden ? 'none' : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        backgroundSize: '14px 14px',
        ...rest.style,
      }}
    />
  );
}
