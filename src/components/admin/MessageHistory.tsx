import { useEffect, useState } from 'react';
import { type MessageRecord, type CommunicationRecipient } from '../../services/communicationService';
import { type Event } from '../../services/eventService';
import { type CommunicationSettings } from '../../services/settingsService';
import { resolvePreviewContent } from '../../lib/communicationUtils';
import { Pagination } from '../common/Pagination';
import { Button, Select, Input } from '../ui';

export type SourceFilter = 'all' | 'manual' | 'automated';

interface MessageHistoryProps {
  history: MessageRecord[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  historySearchQuery: string;
  onHistorySearchChange: (query: string) => void;
  sourceFilter: SourceFilter;
  onSourceFilterChange: (filter: SourceFilter) => void;
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
  sourceFilter,
  onSourceFilterChange,
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

  const filteredHistory = sourceFilter === 'all'
    ? history
    : history.filter((message) => {
        const mFilters = message.filters as Record<string, unknown>;
        const mType = mFilters?.type as string | undefined;
        const isAutomated = mType?.startsWith('Automated') || mType === 'Attendance Report';
        return sourceFilter === 'automated' ? isAutomated : !isAutomated;
      });

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            
            placeholder="Search message history (subject, content, type)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            // @allow-inline-style - dynamic padding based on clear button
            style={{ paddingRight: searchTerm ? '32px' : '12px' }}
          />
          {searchTerm && (
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer border-0 bg-transparent text-xl leading-none text-text-muted"
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
        <Select
          value={sourceFilter}
          onChange={(e) => onSourceFilterChange(e.target.value as SourceFilter)}
          size="small"
        >
          <option value="all">All Sources</option>
          <option value="manual">Manual</option>
          <option value="automated">Automated</option>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-gray-200 text-sm text-gray-500">
              <th className="p-3 px-4 text-left">Date</th>
              <th className="p-3 px-4 text-left">Type</th>
              <th className="p-3 px-4 text-left">Subject</th>
              <th className="p-3 px-4 text-left">Source</th>
              <th className="p-3 px-4 text-center">Recipients</th>
              <th className="p-3 px-4 text-left">Status</th>
              <th className="p-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  {historySearchQuery
                    ? `No messages found matching "${historySearchQuery}".`
                    : 'No messages logged yet.'}
                </td>
              </tr>
            ) : (
              filteredHistory.map((message) => {
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
                        <span className="inline-flex w-fit items-center rounded bg-primary-light px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-primary-deep uppercase">
                          {message.type}
                        </span>
                        {isAutomated && (
                          <span className="inline-flex w-fit items-center rounded bg-danger-bg px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-danger-text uppercase opacity-80">
                            {mType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[250px] truncate p-3 px-4 font-semibold">
                      {resolvedSubject}
                    </td>
                    <td className="p-3 px-4">
                      {isAutomated ? (
                        <span className="inline-flex w-fit items-center rounded bg-danger-bg px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-danger-text uppercase">
                          Automated
                        </span>
                      ) : (
                        <span className="inline-flex w-fit items-center rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="p-3 px-4 text-center">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto min-h-0 cursor-pointer"
                        onClick={() =>
                          onViewRecipients(
                            message.recipients,
                            `Recipients — ${resolvedSubject}`
                          )
                        }
                      >
                        {message.recipients.length} recipient{message.recipients.length !== 1 ? 's' : ''}
                      </Button>
                    </td>
                    <td className="p-3 px-4">
                      {message.status === 'Archived' ? (
                        <span className="inline-flex items-center rounded bg-slate-400 px-2 py-0.5 text-xs font-semibold tracking-wider text-white uppercase">
                          Archived
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded bg-success-bg px-2 py-0.5 text-xs font-semibold tracking-wider text-success-text uppercase">
                          Sent
                        </span>
                      )}
                    </td>
                    <td className="p-3 px-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="small" onClick={() => onViewDetails(message)}>
                          Details
                        </Button>
                        <Button type="button" variant="secondary" size="small" onClick={() => onCopyDraft(message)}>
                          Copy to Draft
                        </Button>
                      </div>
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
