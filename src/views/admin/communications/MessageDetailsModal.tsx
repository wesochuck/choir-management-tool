import { Button, Modal } from '../../../components/ui';
import type { CommunicationSettings } from '../../../services/settingsService';
import type { MessageRecord, DeliverySummary } from '../../../services/communicationService';
import type { Event } from '../../../services/eventService';
import { resolvePreviewContent } from '../../../lib/communicationUtils';
import { DeliverySummaryPanel } from './DeliverySummaryPanel';

interface MessageDetailsModalProps {
  message: MessageRecord | null;
  summary?: DeliverySummary;
  events: Event[];
  commSettings: CommunicationSettings;
  isRetrying: boolean;
  onClose: () => void;
  onCopyDraft: (message: MessageRecord) => void;
  onRetryFailed: (message: MessageRecord, failedCount: number) => Promise<void>;
}

export function MessageDetailsModal({
  message,
  summary,
  events,
  commSettings,
  isRetrying,
  onClose,
  onCopyDraft,
  onRetryFailed,
}: MessageDetailsModalProps) {
  if (!message) return null;

  const canRetry =
    summary &&
    summary.total.failed > 0 &&
    message.status !== 'Archived' &&
    summary.truncated === false;

  const resolvedSubject = (() => {
    const mFilters = message.filters as Record<string, unknown>;
    const eventId = mFilters?.eventId as string | undefined;
    const linkedEvent = events.find((e) => e.id === eventId) || null;
    return resolvePreviewContent(
      message.subject || '(SMS)',
      linkedEvent,
      null,
      commSettings.mailingAddress
    );
  })();

  return (
    <Modal
      isOpen={!!message}
      onClose={onClose}
      title="Message Details"
      maxWidth="600px"
      footer={
        <div className="flex w-full items-center justify-between">
          <div>
            {canRetry && (
              <Button
                variant="danger"
                onClick={() => onRetryFailed(message, summary.total.failed)}
                disabled={isRetrying}
              >
                {isRetrying ? 'Retrying...' : `Retry ${summary.total.failed} Failed`}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onCopyDraft(message)}>
              Copy to Draft
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-xs font-semibold tracking-wider uppercase">
            Subject
          </span>
          <strong className="text-text text-base">{resolvedSubject}</strong>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-xs font-semibold tracking-wider uppercase">
            Sent To
          </span>
          <span className="text-text text-sm">
            {message.status === 'Archived'
              ? 'No recipients because this message was archived before dispatch.'
              : `${message.recipients.length} recipients`}
          </span>
        </div>

        {message.status === 'Archived' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <strong>Archived:</strong> This automated message was archived without sending.
          </div>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-text-muted text-xs font-semibold tracking-wider uppercase">
            Content
          </span>
          <div className="border-border bg-bg text-text max-h-40 overflow-y-auto rounded-lg border p-3 text-sm whitespace-pre-wrap">
            {message.content}
          </div>
        </div>

        {summary && <DeliverySummaryPanel summary={summary} />}
      </div>
    </Modal>
  );
}
