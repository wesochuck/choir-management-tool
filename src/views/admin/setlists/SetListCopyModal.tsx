import { useEffect, useState } from 'react';
import type { Event } from '../../../services/eventService';
import type { SetListCreditCopyMode } from '../../../lib/setList/performerCredits';
import { Button, Modal } from '../../../components/ui';

interface SetListCopyModalProps {
  sourceEvent: Event | null;
  targetEvent: Event | undefined;
  onClose: () => void;
  onCopy: (sourceEventId: string, creditMode: SetListCreditCopyMode) => Promise<void>;
}

export function SetListCopyModal({
  sourceEvent,
  targetEvent,
  onClose,
  onCopy,
}: SetListCopyModalProps) {
  const [creditMode, setCreditMode] = useState<SetListCreditCopyMode>('include');
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    if (sourceEvent) setCreditMode('include');
  }, [sourceEvent]);

  const handleCopy = async () => {
    if (!sourceEvent) return;
    setIsCopying(true);
    try {
      await onCopy(sourceEvent.id, creditMode);
      onClose();
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Modal
      isOpen={!!sourceEvent}
      onClose={onClose}
      title="Copy Set List"
      maxWidth="560px"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={isCopying} onClick={() => void handleCopy()}>
            Copy and Replace
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-text-muted m-0 text-sm">
          Replace the set list for{' '}
          <strong className="text-text">{targetEvent?.title || 'this event'}</strong> with the items
          from <strong className="text-text">{sourceEvent?.title || 'the selected event'}</strong>.
        </p>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="text-label mb-2">Featured performer credits</legend>
          <button
            type="button"
            className={`rounded-md border p-3 text-left ${creditMode === 'include' ? 'border-primary bg-primary-light text-primary-deep' : 'border-border bg-surface text-text'}`}
            onClick={() => setCreditMode('include')}
            aria-pressed={creditMode === 'include'}
          >
            <span className="block text-sm font-semibold">Include performer credits</span>
            <span className="text-text-muted block text-xs">
              Copy roster and guest credits in their current billing order.
            </span>
          </button>
          <button
            type="button"
            className={`rounded-md border p-3 text-left ${creditMode === 'reset' ? 'border-primary bg-primary-light text-primary-deep' : 'border-border bg-surface text-text'}`}
            onClick={() => setCreditMode('reset')}
            aria-pressed={creditMode === 'reset'}
          >
            <span className="block text-sm font-semibold">Reset credits to Performers TBA</span>
            <span className="text-text-muted block text-xs">
              Keep Featured Number markers but remove their selected credits.
            </span>
          </button>
        </fieldset>
      </div>
    </Modal>
  );
}
