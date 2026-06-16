import type { CSSProperties } from 'react';
import SlRange from '@shoelace-style/shoelace/dist/react/range/index.js';

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
}

export function Range({ value, min, max, step, onInput, onChange, className, id, style }: RangeProps) {
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
        style={style}
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
      id={id}
      min={min}
      max={max}
      step={step}
      value={value}
      className={className}
      // @allow-inline-style - CSS custom properties for Shoelace range theming
      style={style}
      onSlInput={onInput ? (e: unknown) => onInput((e as CustomEvent).detail.value as number) : undefined}
      onSlChange={onChange ? (e: unknown) => onChange((e as CustomEvent).detail.value as number) : undefined}
    />
  );
}
