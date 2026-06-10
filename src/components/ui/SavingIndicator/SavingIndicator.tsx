import { Spinner } from '../Spinner/Spinner';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface SavingIndicatorProps {
  state: SaveState;
  errorMessage?: string;
  onRetry?: () => void;
  lastSavedAt?: Date;
}

export function SavingIndicator({
  state, errorMessage, onRetry, lastSavedAt,
}: SavingIndicatorProps) {
  if (state === 'idle') return null;

  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-text-muted">
        <Spinner size="small" /> Saving...
      </span>
    );
  }

  if (state === 'saved') {
    const timeStr = lastSavedAt
      ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    return (
      <span className="inline-flex items-center gap-1 text-sm text-success-text">
        {'\u2713'} Saved{timeStr ? ` at ${timeStr}` : ''}
      </span>
    );
  }

  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-danger-text">
        {'\u26A0'} {errorMessage || 'Save failed'}
        {onRetry && (
          <button className="border-none bg-none text-danger-text cursor-pointer text-sm underline p-0 min-h-auto hover:text-primary" onClick={onRetry} type="button">Retry</button>
        )}
      </span>
    );
  }

  return null;
}
