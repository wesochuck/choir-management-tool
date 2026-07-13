import type { DeliveryDisplayState } from './deliveryPresentation';

interface DeliveryStatusBadgeProps {
  state: DeliveryDisplayState;
  progress?: string;
}

const STATE_LABELS: Record<DeliveryDisplayState, string> = {
  queued: 'Queued',
  sending: 'Sending',
  sent: 'Sent',
  partial: 'Partial',
  failed: 'Failed',
  archived: 'Archived',
  'tracking-unavailable': 'Tracking unavailable',
};

const STATE_CLASSES: Record<DeliveryDisplayState, string> = {
  queued: 'bg-surface-muted text-text-muted border border-border',
  sending: 'bg-primary-light text-primary-deep',
  sent: 'bg-success-bg text-success-text',
  partial: 'bg-warning-bg text-warning-text',
  failed: 'bg-danger-bg text-danger-text',
  archived: 'bg-surface-muted text-text-muted',
  'tracking-unavailable': 'bg-surface-muted text-text-muted',
};

/**
 * Consistent delivery status chip.
 * Uses text in addition to color so it is accessible to color-blind users.
 * aria-label includes the progress string when provided.
 */
export function DeliveryStatusBadge({ state, progress }: DeliveryStatusBadgeProps) {
  const label = STATE_LABELS[state];
  const classes = STATE_CLASSES[state];
  const ariaLabel = progress
    ? `Delivery status: ${label} — ${progress}`
    : `Delivery status: ${label}`;

  return (
    <span
      aria-label={ariaLabel}
      className={`inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${classes}`}
    >
      {label}
    </span>
  );
}
