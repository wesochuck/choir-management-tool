import SlIcon from '@shoelace-style/shoelace/dist/react/icon/index.js';
import { safeSlProps } from '../shared';

export interface IconProps {
  name: string;
  className?: string;
  library?: string;
}

export function Icon({ name, className, library }: IconProps) {
  if (process.env.NODE_ENV === 'test') {
    return <span className={className}>{name}</span>;
  }

  return <SlIcon {...safeSlProps({ name, library: library as 'default' | 'system' | undefined, className } as Record<string, unknown>)} />;
}
