import type { CSSProperties } from 'react';
import SlRange from '@shoelace-style/shoelace/dist/react/range/index.js';
import { safeSlProps } from '../shared';

export interface RangeProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onInput?: (value: number) => void;
  onChange?: (value: number) => void;
  className?: string;
  id?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

export function Range({
  value,
  min,
  max,
  step,
  onInput,
  onChange,
  className,
  id,
  style,
  'aria-label': ariaLabel,
}: RangeProps) {
  if (process.env.NODE_ENV === 'test') {
    return (
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className={className}
        // @allow-inline-style - forwards style prop in test mode
        style={style}
        aria-label={ariaLabel}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          onChange?.(val);
          onInput?.(val);
        }}
      />
    );
  }

  return (
    <SlRange
      {...safeSlProps({
        id,
        min,
        max,
        step,
        value,
        className,
        style,
        'aria-label': ariaLabel,
        // Shoelace emits sl-input and sl-change with an empty detail object;
        // the current numeric value lives on the element itself as `target.value`.
        onSlInput: onInput
          ? (e: unknown) => {
              const target = (e as Event).target as Record<string, unknown> | null;
              const val = target?.['value'];
              const parsed = typeof val === 'number' ? val : parseFloat(String(val));
              onInput(Number.isNaN(parsed) ? 0 : parsed);
            }
          : undefined,
        onSlChange: onChange
          ? (e: unknown) => {
              const target = (e as Event).target as Record<string, unknown> | null;
              const val = target?.['value'];
              const parsed = typeof val === 'number' ? val : parseFloat(String(val));
              onChange(Number.isNaN(parsed) ? 0 : parsed);
            }
          : undefined,
      } as Record<string, unknown>)}
    />
  );
}
