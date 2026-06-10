import { useEffect, useState } from 'react';
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
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 mb-1">
        <div className="relative flex-1">
          <input
            type="text"
            className="card w-full h-10 px-3 border border-gray-200"
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

      <div className="overflow-x-auto">
        <table className="border-collapse w-full min-w-[700px] text-left">
          <thead>
            <tr className="border-b-2 border-gray-200 text-gray-500 text-sm">
              <th className="p-3 px-4 text-left">Date</th>
              <th className="p-3 px-4 text-left">Type</th>
              <th className="p-3 px-4 text-left">Subject</th>
              <th className="p-3 px-4 text-center">Recipients</th>
              <th className="p-3 px-4 text-left">Status</th>
              <th className="p-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-8 text-gray-500">
                  {historySearchQuery
                    ? `No messages found matching "${historySearchQuery}".`
                    : 'No messages logged yet.'}
                </td>
              </tr>
            ) : (
              history.map((message) => {
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
                  <tr key={message.id} className="border-b border-gray-200 text-sm">
                    <td className="p-3 px-4 whitespace-nowrap">
                      {new Date(message.created).toLocaleString()}
                    </td>
                    <td className="p-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary-light text-primary-deep w-fit">
                          {message.type}
                        </span>
                        {isAutomated && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-performance-bg text-performance-text opacity-80 w-fit">
                            {mType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 px-4 font-semibold max-w-[300px] truncate">
                      {resolvedSubject}
                    </td>
                    <td className="p-3 px-4 text-center">
                      <button
                        type="button"
                        className="btn btn-ghost p-0 border-0 bg-transparent min-h-0 h-auto text-xs text-primary underline cursor-pointer"
                        onClick={() =>
                          onViewRecipients(
                            message.recipients,
                            `Recipients — ${resolvedSubject}`
                          )
                        }
                      >
                        {message.recipients.length} recipient{message.recipients.length !== 1 ? 's' : ''}
                      </button>
                    </td>
                    <td className="p-3 px-4">
                      {message.status === 'Archived' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-slate-400 text-white">
                          Archived
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-success-bg text-success-text">
                          Sent
                        </span>
                      )}
                    </td>
                    <td className="p-3 px-4 text-right whitespace-nowrap">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onViewDetails(message)}>
                        Details
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCopyDraft(message)}>
                        Copy to Draft
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
