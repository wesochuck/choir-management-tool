import type { ReactNode } from 'react';
import SlRadioGroup from '@shoelace-style/shoelace/dist/react/radio-group/index.js';
import SlRadio from '@shoelace-style/shoelace/dist/react/radio/index.js';
import { safeSlProps } from '../shared';

export interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  children?: ReactNode;
  className?: string;
}

export interface RadioProps {
  value: string;
  children?: ReactNode;
  className?: string;
}

export function RadioGroup({ value, onChange, children, className }: RadioGroupProps) {
  if (process.env.NODE_ENV === 'test') {
    return <div className={className}>{children}</div>;
  }

  return (
    <SlRadioGroup
      {...safeSlProps({ value, className } as Record<string, unknown>)}
      onSlChange={(e: unknown) => {
        onChange((e as CustomEvent).detail.value as string);
      }}
    >
      {children}
    </SlRadioGroup>
  );
}

export function Radio({ value, children, className }: RadioProps) {
  if (process.env.NODE_ENV === 'test') {
    return (
      <label className={className}>
        <input type="radio" value={value} />
        {children}
      </label>
    );
  }

  return (
    <SlRadio {...safeSlProps({ value, className } as Record<string, unknown>)}>{children}</SlRadio>
  );
}
