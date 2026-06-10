import styles from './Badge.module.css';

export type BadgeTone = 'performance' | 'rehearsal' | 'concert' | 'success' | 'danger' | 'neutral';

export interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return <span className={[styles.badge, styles[tone]].join(' ')}>{children}</span>;
}
