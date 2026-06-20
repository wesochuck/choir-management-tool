import React, { useImperativeHandle, useRef } from 'react';
import SlInput from '@shoelace-style/shoelace/dist/react/input/index.js';
import type SlInputElement from '@shoelace-style/shoelace/dist/components/input/input.component.js';
import { layoutOnly, safeSlProps } from '../shared';
import { formControlBase, formControlHeight, formControlStyles } from '../formControlBase';

export interface InputProps extends Omit<React.ComponentPropsWithoutRef<'input'>, 'size'> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      invalid,
      className,
      type,
      onChange,
      onInput,
      onBlur,
      onFocus,
      value,
      defaultValue,
      placeholder,
      disabled,
      required,
      readOnly,
      name,
      autoFocus,
      children,
      ...rest
    },
    ref
  ) => {
    const slRef = useRef<SlInputElement | null>(null);
    const nativeRef = useRef<HTMLInputElement | null>(null);

    useImperativeHandle(ref, () => {
      if (type === 'file') {
        return nativeRef.current as unknown as HTMLInputElement;
      }
      return {
        focus: () => slRef.current?.focus(),
        blur: () => slRef.current?.blur(),
        select: () => slRef.current?.select(),
        get value() {
          return slRef.current?.value || '';
        },
        set value(val) {
          if (slRef.current) slRef.current.value = val;
        },
        setCustomValidity: (message: string) => slRef.current?.setCustomValidity(message),
        reportValidity: () => slRef.current?.reportValidity?.() ?? false,
      } as unknown as HTMLInputElement;
    });

    // File inputs must use a native <input>: SlInput's internal live(value) binding
    // sets the inner input's .value on every render, which throws InvalidStateError
    // for file inputs (browsers only allow setting .value to '').
    if (type === 'file') {
      const classNames = [
        formControlBase + ' ' + formControlHeight,
        'flex items-center py-0',
        invalid && 'border-danger-text focus:shadow-[0_0_0_3px_rgba(153,27,27,0.25)]',
        className,
      ]
        .filter(Boolean)
        .join(' ');
      return (
        <input
          ref={nativeRef}
          type={type}
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
          className={classNames}
          {...(rest as Record<string, unknown>)}
        />
      );
    }

    if (process.env.NODE_ENV === 'test') {
      const classNames = [
        formControlBase + ' ' + formControlHeight,
        invalid && 'border-danger-text focus:shadow-[0_0_0_3px_rgba(153,27,27,0.25)]',
        className,
      ]
        .filter(Boolean)
        .join(' ');
      return (
        <input
          ref={ref}
          type={type}
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
          type: type || 'text',
        } as unknown as HTMLInputElement;

        const mockEvent = {
          ...customEvent,
          target: mockTarget,
          currentTarget: mockTarget,
          nativeEvent: customEvent,
          preventDefault: () => customEvent.preventDefault(),
          stopPropagation: () => customEvent.stopPropagation(),
        } as unknown as React.ChangeEvent<HTMLInputElement>;

        if (onInput) (onInput as (ev: unknown) => void)(mockEvent);
        if (onChange) (onChange as (ev: unknown) => void)(mockEvent);
      }
    };

    return (
      <div className={`overflow-visible py-[3px] ${layoutOnly(className)}`}>
        <SlInput
          ref={slRef}
          {...safeSlProps({
            type: type as SlInputElement['type'],
            value: value !== undefined ? String(value) : undefined,
            defaultValue: defaultValue !== undefined ? String(defaultValue) : undefined,
            placeholder,
            disabled,
            required,
            readonly: readOnly,
            name,
            className: 'w-full',
            onSlInput: handleInput,
            onSlBlur: onBlur
              ? (ev: unknown) => onBlur(ev as React.FocusEvent<HTMLInputElement>)
              : undefined,
            onSlFocus: onFocus
              ? (ev: unknown) => onFocus(ev as React.FocusEvent<HTMLInputElement>)
              : undefined,
            // @allow-inline-style - Shoelace CSS variable overrides for focus ring and border
            style: {
              ...formControlStyles,
              ...(invalid ? { '--sl-input-border-color': 'var(--color-danger)' } : {}),
            } as React.CSSProperties,
            ...(rest as Record<string, unknown>),
          } as Record<string, unknown>)}
        >
          {children}
        </SlInput>
      </div>
    );
  }
);

Input.displayName = 'Input';
