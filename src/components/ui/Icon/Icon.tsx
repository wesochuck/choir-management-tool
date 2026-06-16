import SlIcon from '@shoelace-style/shoelace/dist/react/icon/index.js';

export interface IconProps {
  name: string;
  className?: string;
  library?: string;
}

export function Icon({ name, className, library }: IconProps) {
  if (process.env.NODE_ENV === 'test') {
    return <span className={className}>{name}</span>;
  }

  return <SlIcon name={name} library={library as 'default' | 'system' | undefined} className={className} />;
}
