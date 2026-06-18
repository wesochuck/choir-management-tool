import { useMemo } from 'react';
import { Button, Badge, Modal } from '../../../components/ui';
import { formatInTimezone } from '../../../lib/timezone';
import type { CommunicationRecipient } from '../../../services/communicationService';
import type { Event } from '../../../services/eventService';
import type { PollRecord, PollStat, PollMessage } from './types';

interface PollDetailsModalProps {
  poll: PollRecord | null;
  stat?: PollStat;
  event?: Event | null;
  pollMessages: PollMessage[];
  timezone: string;
  isDeleting?: boolean;
  onClose: () => void;
  onDelete: (pollId: string) => void | Promise<void>;
  onViewContactedList: (options: { recipients: CommunicationRecipient[]; title: string }) => void;
}

function PollResponseList({
  title,
  count,
  tone,
  emptyText,
  responses,
}: {
  title: string;
  count: number;
  tone: 'yes' | 'no';
  emptyText: string;
  responses: PollResponseRecord[];
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <h4
        className={`m-0 border-b-2 pb-1.5 text-xs font-black tracking-wider uppercase ${
          tone === 'yes'
            ? 'border-primary/20 text-primary'
            : 'border-danger-text/20 text-danger-text'
        }`}
      >
        {title} ({count})
      </h4>
      {!responses?.length ? (
        <p className="m-0 text-sm font-medium text-slate-400 italic">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {responses.map((r) => (
            <div
              key={r.id}
              className={`rounded-lg border bg-white p-2.5 px-4 shadow-sm ${
                tone === 'no' ? 'border-danger-text/10 opacity-90' : 'border-slate-100'
              }`}
            >
              <div className="text-sm font-bold text-slate-800">
                {r.expand?.profileId?.name ?? 'Unknown'}
              </div>
              <div className="text-[0.7rem] font-bold tracking-wide text-slate-400 uppercase">
                {r.expand?.profileId?.voicePart ?? ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PollDetailsModal({
  poll,
  stat,
  event,
  pollMessages,
  timezone,
  isDeleting = false,
  onClose,
  onDelete,
  onViewContactedList,
}: PollDetailsModalProps) {
  const isArchived = useMemo(() => {
    if (!poll) return false;
    const eventExpired = poll.eventId && event ? new Date(event.date) < new Date() : false;
    const archiveExpired = poll.archiveAt
      ? new Date(poll.archiveAt.replace(' ', 'T')) < new Date()
      : false;
    return eventExpired || archiveExpired;
  }, [poll, event]);

  const createdLabel = poll?.created
    ? formatInTimezone(poll.created, timezone, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const archiveLabel = poll?.archiveAt
    ? formatInTimezone(poll.archiveAt, timezone, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const contactedSingers = useMemo(() => {
    if (!poll) return [];
    const contactedMap = new Map<string, CommunicationRecipient>();
    const msgs = pollMessages.filter((msg) => msg.content.includes(`{{POLL_LINK:${poll.id}}}`));
    msgs.forEach((msg) => {
      if (Array.isArray(msg.recipients)) {
        msg.recipients.forEach((rec) => contactedMap.set(rec.id, rec));
      }
    });
    return Array.from(contactedMap.values());
  }, [poll, pollMessages]);

  return (
    <Modal
      isOpen={!!poll}
      onClose={onClose}
      title={poll?.question ?? ''}
      maxWidth="720px"
      footer={
        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="danger"
            disabled={isDeleting}
            onClick={() => poll && void onDelete(poll.id)}
            className="w-full sm:w-auto"
          >
            {isDeleting ? 'Deleting\u2026' : 'Delete Poll'}
          </Button>
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      }
    >
      {poll && (
        <div className="flex flex-col gap-6">
          {/* Status + metadata cards */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <Badge tone={isArchived ? 'neutral' : 'success'}>
              {isArchived ? 'Archived' : 'Active'}
            </Badge>
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              {createdLabel && (
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                  <div className="text-overline text-slate-400">Created</div>
                  <div className="text-sm font-bold text-slate-700">{createdLabel}</div>
                </div>
              )}
              {archiveLabel && (
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                  <div className="text-overline text-slate-400">
                    {isArchived ? 'Archived' : 'Expires'}
                  </div>
                  <div className="text-sm font-bold text-slate-700">{archiveLabel}</div>
                </div>
              )}
            </div>
          </div>

          {/* Event context */}
          {event && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm">
              <div className="text-overline text-slate-400">Related Event</div>
              <div className="font-bold text-slate-800">{event.title}</div>
              <div className="text-slate-500">
                {formatInTimezone(event.date, timezone, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
            </div>
          )}

          {/* Yes / No response totals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border-primary/20 bg-primary/5 rounded-xl border p-4 text-center">
              <div className="text-primary text-3xl font-black">{stat?.yes ?? 0}</div>
              <div className="text-overline text-primary">Yes</div>
            </div>
            <div className="border-danger-text/20 bg-danger-bg rounded-xl border p-4 text-center">
              <div className="text-danger-text text-3xl font-black">{stat?.no ?? 0}</div>
              <div className="text-overline text-danger-text">No</div>
            </div>
          </div>

          {/* Contacted singers */}
          <div className="rounded-xl border border-slate-100 bg-white p-3 text-sm">
            {contactedSingers.length > 0 ? (
              <span>
                Sent to {contactedSingers.length} singer
                {contactedSingers.length !== 1 ? 's' : ''}.
                <button
                  type="button"
                  className="text-primary hover:text-primary-deep ml-1 cursor-pointer border-none bg-transparent p-0 font-semibold underline transition-colors"
                  onClick={() =>
                    onViewContactedList({
                      recipients: contactedSingers,
                      title: `Contacted Singers \u2014 ${poll.question}`,
                    })
                  }
                >
                  View contacted list \u2192
                </button>
              </span>
            ) : (
              <span className="text-slate-500">No sent communications found yet.</span>
            )}
          </div>

          {/* Volunteers / Declined lists */}
          <div className="flex flex-col gap-8 md:flex-row">
            <PollResponseList
              title="Volunteers"
              count={stat?.yes ?? 0}
              tone="yes"
              emptyText="No volunteers yet."
              responses={stat?.volunteers ?? []}
            />
            <PollResponseList
              title="Declined"
              count={stat?.no ?? 0}
              tone="no"
              emptyText="No decliners yet."
              responses={stat?.decliners ?? []}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
