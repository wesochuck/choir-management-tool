import React from 'react';
import type { DisplayTone } from '../../lib/statusDisplay';

interface StatusBadgeProps {
  label: string;
  tone: DisplayTone;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, tone, size = 'md' }) => (
  <span className={`status-badge status-badge-${size} status-badge-${tone}`}>
    {label}
  </span>
);
