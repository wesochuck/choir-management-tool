export type BadgeTone = 'performance' | 'rehearsal' | 'concert' | 'success' | 'danger' | 'neutral';

export interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  performance: 'bg-performance-bg text-performance-text',
  rehearsal: 'bg-primary-light text-primary-deep',
  concert: 'bg-performance-bg text-performance-text',
  success: 'bg-success-bg text-success-text',
  danger: 'bg-danger-bg text-danger-text',
  neutral: 'bg-gray-500/10 text-gray-600 border border-gray-500/20',
};

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-xs font-semibold tracking-wider uppercase ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
