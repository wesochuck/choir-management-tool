import { useEffect, useState } from 'react';
import { AppCard } from '../common/AppCard';
import { type MessageRecord, type CommunicationRecipient } from '../../services/communicationService';
import { type Event } from '../../services/eventService';
import { type CommunicationSettings } from '../../services/settingsService';
import { resolvePreviewContent } from '../../lib/communicationUtils';
import { Pagination } from '../common/Pagination';

interface MessageHistoryProps {
  history: MessageRecord[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  historySearchQuery: string;
  onHistorySearchChange: (query: string) => void;
  onViewDetails: (message: MessageRecord) => void;
  onCopyDraft: (message: MessageRecord) => void;
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
  events: Event[];
  commSettings: CommunicationSettings;
}

export function MessageHistory({
  history,
  currentPage,
  totalPages,
  onPageChange,
  historySearchQuery,
  onHistorySearchChange,
  onViewDetails,
  onCopyDraft,
  onViewRecipients,
  events,
  commSettings,
}: MessageHistoryProps) {
  const [searchTerm, setSearchTerm] = useState(historySearchQuery);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchTerm !== historySearchQuery) {
        onHistorySearchChange(searchTerm);
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchTerm, historySearchQuery, onHistorySearchChange]);

  useEffect(() => {
    setSearchTerm(historySearchQuery);
  }, [historySearchQuery]);

  return (
    <div className="flex-col gap-4">
      <div className="flex gap-2 mb-1">
        <div className="relative flex-1">
          <input
            type="text"
            className="input w-full"
            placeholder="Search message history (subject, content, type)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingRight: searchTerm ? '32px' : '12px' }} // @allow-inline-style - dynamic padding based on clear button
          />
          {searchTerm && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer text-text-muted text-xl leading-none"
              onClick={() => {
                setSearchTerm('');
                onHistorySearchChange('');
              }}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <AppCard noPadding>
        {history.map((message) => {
          const mFilters = message.filters as Record<string, unknown>;
          const mType = mFilters?.type as string | undefined;
          const isAutomated = mType?.startsWith('Automated') || mType === 'Attendance Report';

          const eventId = mFilters?.eventId as string | undefined;
          const linkedEvent = events.find(e => e.id === eventId) || null;
          const resolvedSubject = resolvePreviewContent(
            message.subject || 'SMS message',
            linkedEvent,
            null,
            commSettings.mailingAddress
          );

          return (
            <div key={message.id} className="p-3 border-b border-border flex flex-col md:flex-row last:border-b-0 justify-between items-start md:items-center gap-4">
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex gap-2 items-center">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary-light text-primary-deep">{message.type}</span>
                  {message.status === 'Archived' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-400 text-white">
                      Archived
                    </span>
                  )}
                  {isAutomated && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-performance-bg text-performance-text opacity-80">{mType}</span>}
                  <span className="text-muted text-xs">{new Date(message.created).toLocaleString()}</span>
                </div>
                <h3 className="m-0 text-sm font-bold">{resolvedSubject}</h3>
                <button
                  type="button"
                  className="btn btn-ghost p-0 border-0 bg-transparent min-h-0 h-auto text-xs text-primary underline self-start cursor-pointer"
                  onClick={() =>
                    onViewRecipients(
                      message.recipients,
                      `Recipients — ${resolvedSubject}`
                    )
                  }
                >
                  {message.recipients.length} recipient{message.recipients.length !== 1 ? 's' : ''} →
                </button>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onViewDetails(message)}>Details</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCopyDraft(message)}>Copy to Draft</button>
              </div>
            </div>
          );
        })}
        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <p className="text-muted">
              {historySearchQuery 
                ? `No messages found matching "${historySearchQuery}".` 
                : "No messages logged yet."}
            </p>
          </div>
        )}
      </AppCard>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
