import React, { useImperativeHandle, useRef } from 'react';
import SlTextarea from '@shoelace-style/shoelace/dist/react/textarea/index.js';
import type SlTextareaElement from '@shoelace-style/shoelace/dist/components/textarea/textarea.component.js';
import { layoutOnly, safeSlProps } from '../shared';

export interface TextareaProps extends Omit<React.ComponentPropsWithoutRef<'textarea'>, 'size'> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ invalid, className, onChange, onInput, onBlur, onFocus, value, defaultValue, placeholder, disabled, required, readOnly, name, autoFocus, rows, children, ...rest }, ref) => {
    const slRef = useRef<SlTextareaElement | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => slRef.current?.focus(),
      blur: () => slRef.current?.blur(),
      select: () => slRef.current?.select(),
      get value() { return slRef.current?.value || ''; },
      set value(val) { if (slRef.current) slRef.current.value = val; },
      setCustomValidity: (message: string) => slRef.current?.setCustomValidity(message),
      reportValidity: () => slRef.current?.reportValidity?.() ?? false,
    } as unknown as HTMLTextAreaElement));

    if (process.env.NODE_ENV === 'test') {
      const classNames = [
        'block w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm transition-colors outline-none placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary',
        invalid && 'border-danger-text focus:shadow-[0_0_0_3px_rgba(153,27,27,0.25)]',
        className,
      ].filter(Boolean).join(' ');
      return (
        <textarea
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onInput={onInput}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          readOnly={readOnly}
          name={name}
          autoFocus={autoFocus}
          rows={rows}
          className={classNames}
          {...(rest as Record<string, unknown>)}
        />
      );
    }

    const handleInput = (e: unknown) => {
      if (onChange || onInput) {
        const customEvent = e as CustomEvent;
        const mockTarget = {
          ...customEvent.target,
          value: slRef.current?.value || '',
          name: name || '',
        } as unknown as HTMLTextAreaElement;

        const mockEvent = {
          ...customEvent,
          target: mockTarget,
          currentTarget: mockTarget,
          nativeEvent: customEvent,
          preventDefault: () => customEvent.preventDefault(),
          stopPropagation: () => customEvent.stopPropagation(),
        } as unknown as React.ChangeEvent<HTMLTextAreaElement>;

        if (onInput) (onInput as (ev: unknown) => void)(mockEvent);
        if (onChange) (onChange as (ev: unknown) => void)(mockEvent);
      }
    };

    return (
      <SlTextarea
        ref={slRef}
        {...safeSlProps({
          value: value !== undefined ? String(value) : undefined,
          defaultValue: defaultValue !== undefined ? String(defaultValue) : undefined,
          placeholder,
          disabled,
          required,
          readonly: readOnly,
          name,
          rows,
          className: layoutOnly(className),
          onSlInput: handleInput,
          onSlBlur: onBlur ? (ev: unknown) => onBlur(ev as React.FocusEvent<HTMLTextAreaElement>) : undefined,
          onSlFocus: onFocus ? (ev: unknown) => onFocus(ev as React.FocusEvent<HTMLTextAreaElement>) : undefined,
          // @allow-inline-style - dynamic invalid border color override
          style: invalid ? { '--sl-input-border-color': 'var(--color-danger)' } as React.CSSProperties : undefined,
          ...(rest as Record<string, unknown>),
        } as Record<string, unknown>)}
      >
        {children}
      </SlTextarea>
    );
  }
);

Textarea.displayName = 'Textarea';
