import { useEffect, useState } from 'react';
import {
  type MessageRecord,
  type CommunicationRecipient,
} from '../../services/communicationService';
import { type Event } from '../../services/eventService';
import { type CommunicationSettings } from '../../services/settingsService';
import { resolvePreviewContent } from '../../lib/communicationUtils';
import { Pagination } from '../common/Pagination';
import { Button, Select, Input, DataTable, type ColumnDef } from '../ui';

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

  const filteredHistory =
    sourceFilter === 'all'
      ? history
      : history.filter((message) => {
          const mFilters = message.filters as Record<string, unknown>;
          const mType = mFilters?.type as string | undefined;
          const isAutomated = mType?.startsWith('Automated') || mType === 'Attendance Report';
          return sourceFilter === 'automated' ? isAutomated : !isAutomated;
        });

  const getMessageMeta = (message: MessageRecord) => {
    const mFilters = message.filters as Record<string, unknown>;
    const mType = mFilters?.type as string | undefined;
    const isAutomated = mType?.startsWith('Automated') || mType === 'Attendance Report';
    return { mType, isAutomated };
  };

  const getResolvedSubject = (message: MessageRecord) => {
    const mFilters = message.filters as Record<string, unknown>;
    const eventId = mFilters?.eventId as string | undefined;
    const linkedEvent = events.find((e) => e.id === eventId) || null;
    return resolvePreviewContent(
      message.subject || 'SMS message',
      linkedEvent,
      null,
      commSettings.mailingAddress
    );
  };

  const columns: ColumnDef<MessageRecord>[] = [
    {
      id: 'date',
      header: 'Date',
      enableSorting: false,
      cell: (_, row) => (
        <span className="whitespace-nowrap">{new Date(row.created).toLocaleString()}</span>
      ),
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Date',
    },
    {
      id: 'type',
      header: 'Type',
      enableSorting: false,
      cell: (_, row) => {
        const { mType, isAutomated } = getMessageMeta(row);
        return (
          <div className="flex flex-col gap-1">
            <span className="bg-primary-light text-primary-deep inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
              {row.type}
            </span>
            {isAutomated && mType && (
              <span className="bg-danger-bg text-danger-text inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase opacity-80">
                {mType}
              </span>
            )}
          </div>
        );
      },
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Type',
    },
    {
      id: 'subject',
      header: 'Subject',
      enableSorting: false,
      cell: (_, row) => (
        <span className="block max-w-[250px] truncate font-semibold">
          {getResolvedSubject(row)}
        </span>
      ),
      cardSection: 0,
      cardSide: 'left',
    },
    {
      id: 'source',
      header: 'Source',
      enableSorting: false,
      cell: (_, row) => {
        const { isAutomated } = getMessageMeta(row);
        return isAutomated ? (
          <span className="bg-danger-bg text-danger-text inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
            Automated
          </span>
        ) : (
          <span className="inline-flex w-fit items-center rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
            Manual
          </span>
        );
      },
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Source',
    },
    {
      id: 'recipients',
      header: 'Recipients',
      align: 'center',
      enableSorting: false,
      cell: (_, row) => (
        <button
          type="button"
          className="text-primary hover:text-primary-deep cursor-pointer border-none bg-transparent p-0 text-sm font-semibold underline decoration-dotted underline-offset-2 transition-colors"
          onClick={() =>
            onViewRecipients(row.recipients, `Recipients — ${getResolvedSubject(row)}`)
          }
        >
          {row.recipients.length} recipient{row.recipients.length !== 1 ? 's' : ''}
        </button>
      ),
      cardSection: 1,
      cardSide: 'right',
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: (_, row) =>
        row.status === 'Archived' ? (
          <span className="inline-flex items-center rounded bg-slate-400 px-2 py-0.5 text-xs font-semibold tracking-wider text-white uppercase">
            Archived
          </span>
        ) : (
          <span className="bg-success-bg text-success-text inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase">
            Sent
          </span>
        ),
      cardSection: 0,
      cardSide: 'right',
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      enableSorting: false,
      cell: (_, row) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button type="button" variant="outline" size="small" onClick={() => onViewDetails(row)}>
            Details
          </Button>
          <Button type="button" variant="secondary" size="small" onClick={() => onCopyDraft(row)}>
            Copy to Draft
          </Button>
        </div>
      ),
      cardSection: 1,
      cardSide: 'right',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search message history (subject, content, type)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={searchTerm ? 'pr-8' : 'pr-3'}
          />
          {searchTerm && (
            <button
              type="button"
              className="text-text-muted absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer border-0 bg-transparent text-xl leading-none"
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

      <DataTable
        columns={columns}
        data={filteredHistory}
        isLoading={false}
        emptyState={{
          title: historySearchQuery
            ? `No messages found matching "${historySearchQuery}".`
            : 'No messages logged yet.',
          icon: '📬',
        }}
        manualPagination
        pageCount={totalPages}
        onPaginationChange={(state) => onPageChange(state.pageIndex + 1)}
        hidePagination
        getRowId={(message) => message.id}
      />

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
