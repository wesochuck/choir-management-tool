import React from 'react';

export type BadgeTone =
  | 'performance'
  | 'rehearsal'
  | 'concert'
  | 'success'
  | 'danger'
  | 'neutral'
  | 'warning'
  | 'muted'
  | 'primary';

export interface BadgeProps {
  children?: React.ReactNode;
  label?: string;
  tone?: BadgeTone;
  size?: 'sm' | 'md';
}

const toneClasses: Record<BadgeTone, string> = {
  performance: 'bg-danger-bg text-danger-text',
  rehearsal: 'bg-primary-light text-primary-deep',
  concert: 'bg-danger-bg text-danger-text',
  success: 'bg-success-bg text-success-text',
  danger: 'bg-danger-bg text-danger-text',
  neutral: 'bg-gray-500/10 text-gray-600 border border-gray-500/20',
  warning: 'bg-amber-100 text-amber-800',
  muted: 'bg-gray-500/10 text-gray-600 border border-gray-500/20',
  primary: 'bg-primary-light text-primary-deep',
};

export function Badge({ children, label, tone = 'neutral', size = 'md' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-1.5 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center rounded font-semibold tracking-wider uppercase ${sizeClass} ${toneClasses[tone]}`}
    >
      {children ?? label}
    </span>
  );
}
