import React, { useImperativeHandle, useRef } from 'react';
import SlSelect from '@shoelace-style/shoelace/dist/react/select/index.js';
import SlOption from '@shoelace-style/shoelace/dist/react/option/index.js';
import type SlSelectElement from '@shoelace-style/shoelace/dist/components/select/select.component.js';
import { layoutOnly } from '../shared';

export type SelectSize = 'default' | 'small' | 'compact';

export interface SelectProps extends Omit<React.ComponentPropsWithoutRef<'select'>, 'size'> {
  invalid?: boolean;
  size?: SelectSize;
  visuallyHidden?: boolean;
}

const sizeClasses: Record<SelectSize, string> = {
  default: 'h-[44px] pl-3 pr-9 py-2 text-sm',
  small: 'h-10 pl-3 pr-9 py-1.5 text-sm',
  compact: 'h-8 pl-2 pr-7 py-0.5 text-xs',
};

function convertOptions(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      if (child.type === 'option') {
        const props = child.props as Record<string, unknown>;
        const { value: optionValue, disabled, children: optionChildren, ...restProps } = props;
        return (
          <SlOption 
            value={optionValue !== undefined ? String(optionValue) : ''} 
            disabled={Boolean(disabled)} 
            {...(restProps as Record<string, unknown>)}
          >
            {optionChildren as React.ReactNode}
          </SlOption>
        );
      }
      if (child.props && typeof child.props === 'object') {
        const props = child.props as Record<string, unknown>;
        if (props.children) {
          return React.cloneElement(child, {
            children: convertOptions(props.children as React.ReactNode),
          } as unknown as React.Attributes);
        }
      }
    }
    return child;
  });
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ invalid, size = 'default', visuallyHidden = false, className, onChange, onBlur, value, defaultValue, children, ...rest }, ref) => {
    const slRef = useRef<SlSelectElement | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => slRef.current?.focus(),
      blur: () => slRef.current?.blur(),
      get value() { return slRef.current?.value || ''; },
      set value(val) { if (slRef.current) slRef.current.value = val; },
    } as unknown as HTMLSelectElement));

    if (process.env.NODE_ENV === 'test' || visuallyHidden) {
      const classNames = [
        visuallyHidden 
          ? '!absolute !inset-0 !size-full !cursor-pointer !opacity-0 !border-none !bg-transparent !p-0 hover:!bg-transparent focus:!shadow-none'
          : 'appearance-none border border-border rounded-md text-text bg-surface cursor-pointer outline-none transition-[border-color,box-shadow,background-color] duration-200 w-full disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary hover:bg-primary-light focus:border-primary focus:shadow-[0_0_0_3px_rgba(74,124,89,0.25)]',
        !visuallyHidden && sizeClasses[size],
        !visuallyHidden && invalid && 'border-danger-text focus:shadow-[0_0_0_3px_rgba(153,27,27,0.25)]',
        className,
      ].filter(Boolean).join(' ');

      return (
        <select
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onBlur={onBlur}
          className={classNames}
          // @allow-inline-style - SVG background data URI fallback for visuallyHidden native select
          style={{
            backgroundImage: visuallyHidden ? 'none' : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            backgroundSize: '14px 14px',
            ...rest.style,
          }}
          {...(rest as Record<string, unknown>)}
        >
          {children}
        </select>
      );
    }

    const handleChange = (e: unknown) => {
      if (onChange && slRef.current) {
        const customEvent = e as CustomEvent;
        const queriedOptions = Array.from(slRef.current.querySelectorAll('sl-option'));
        
        const value = slRef.current.value;
        const selectedValue = Array.isArray(value) ? value[0] : value;
        const selectedIndex = queriedOptions.findIndex(
          (opt) => (opt as unknown as { value: string }).value === selectedValue
        );

        const mockOptionsList = queriedOptions.map((opt) => {
          const val = (opt as unknown as { value: string }).value || '';
          const text = opt.textContent || '';
          return {
            value: val,
            text: text,
            label: text,
            disabled: (opt as unknown as { disabled: boolean }).disabled || false,
            getAttribute: (name: string) => opt.getAttribute(name),
          };
        });

        const mockOptionsCollection = Object.assign(mockOptionsList, {
          item: (index: number) => mockOptionsList[index] || null,
          namedItem: (name: string) => mockOptionsList.find(opt => opt.value === name) || null,
        }) as unknown as HTMLOptionsCollection;

        const mockTarget = {
          ...customEvent.target,
          value: slRef.current.value,
          name: rest.name || '',
          options: mockOptionsCollection,
          selectedIndex: selectedIndex,
        } as unknown as HTMLSelectElement;

        const mockEvent = {
          ...customEvent,
          target: mockTarget,
          currentTarget: mockTarget,
          nativeEvent: customEvent,
          preventDefault: () => customEvent.preventDefault(),
          stopPropagation: () => customEvent.stopPropagation(),
        } as unknown as React.ChangeEvent<HTMLSelectElement>;

        onChange(mockEvent);
      }
    };

    const convertedChildren = convertOptions(children);
    const slSize = size === 'compact' || size === 'small' ? 'small' : 'medium';

    return (
      <SlSelect
        ref={slRef}
        size={slSize}
        value={value !== undefined ? String(value) : undefined}
        defaultValue={defaultValue !== undefined ? String(defaultValue) : undefined}
        disabled={rest.disabled}
        required={rest.required}
        name={rest.name}
        onSlChange={handleChange}
        onSlBlur={onBlur ? (ev: unknown) => onBlur(ev as React.FocusEvent<HTMLSelectElement>) : undefined}
        className={layoutOnly(className)}
        // @allow-inline-style - dynamic invalid border color override
        style={invalid ? { '--sl-input-border-color': 'var(--color-danger)' } as React.CSSProperties : undefined}
      >
        {convertedChildren}
      </SlSelect>
    );
  }
);

Select.displayName = 'Select';
