import SlColorPicker from '@shoelace-style/shoelace/dist/react/color-picker/index.js';
import { safeSlProps } from '../shared';

export interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  size?: 'small' | 'medium' | 'large';
  label?: string;
  className?: string;
}

export function ColorPicker({ value, onChange, size, label, className }: ColorPickerProps) {
  if (process.env.NODE_ENV === 'test') {
    return (
      <input
        type="color"
        value={value}
        className={className}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <SlColorPicker
      {...safeSlProps({
        value,
        size: size as 'small' | 'medium' | 'large' | undefined,
        label,
        className,
      } as Record<string, unknown>)}
      onSlChange={(e: unknown) => {
        onChange((e as CustomEvent).detail.value as string);
      }}
    />
  );
}
