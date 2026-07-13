import type React from 'react';
import { Button } from '../../../components/ui';
import { formatPocketBaseError } from '../../../lib/pocketbase';
import type { DraftSaveStatus as StatusType } from './useDraftAutosave';

interface DraftSaveStatusProps {
  status: StatusType;
  error: unknown;
  onSaveNow: () => Promise<void>;
  onRetry: () => Promise<void>;
  onReloadLatest: () => void;
  onSaveAsCopy: () => Promise<void>;
}

export const DraftSaveStatus: React.FC<DraftSaveStatusProps> = ({
  status,
  error,
  onSaveNow,
  onRetry,
  onReloadLatest,
  onSaveAsCopy,
}) => {
  if (status === 'idle') return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
      <span className="text-text-muted select-none" aria-live="polite">
        {status === 'saving' && 'Saving…'}
        {status === 'saved' && 'Saved just now'}
        {status === 'dirty' && 'Unsaved changes'}
        {status === 'error' && (
          <span className="text-danger flex items-center gap-1">
            ⚠️ {error ? formatPocketBaseError(error) : 'Failed to save'}
          </span>
        )}
        {status === 'conflict' && (
          <span className="flex items-center gap-1 text-amber-600">
            ⚠️ Editing conflict: Draft changed on server
          </span>
        )}
      </span>

      {status === 'dirty' && (
        <Button type="button" variant="secondary" size="small" onClick={onSaveNow}>
          Save now
        </Button>
      )}

      {status === 'error' && (
        <Button type="button" variant="secondary" size="small" onClick={onRetry}>
          Retry saving draft
        </Button>
      )}

      {status === 'conflict' && (
        <div className="flex gap-1.5">
          <Button type="button" variant="secondary" size="small" onClick={onReloadLatest}>
            Reload latest draft
          </Button>
          <Button type="button" variant="outline" size="small" onClick={onSaveAsCopy}>
            Save local changes as a copy
          </Button>
        </div>
      )}
    </div>
  );
};
