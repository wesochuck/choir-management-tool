import { useEffect, useMemo, useState } from 'react';
import {
  type MessageRecord,
  type CommunicationRecipient,
  type DeliverySummary,
} from '../../services/communicationService';
import { type Event } from '../../services/eventService';
import { type CommunicationSettings } from '../../services/settingsService';
import { resolvePreviewContent } from '../../lib/communicationUtils';
import { Button, Select, Input, DataTable, type ColumnDef } from '../ui';
import {
  resolveDeliveryDisplayState,
  formatDeliveryProgress,
  type DeliveryStatusFilter,
} from '../../views/admin/communications/deliveryPresentation';
import { DeliveryStatusBadge } from '../../views/admin/communications/DeliveryStatusBadge';

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
  statusFilter: DeliveryStatusFilter;
  onStatusFilterChange: (filter: DeliveryStatusFilter) => void;
  summaries: Record<string, DeliverySummary>;
  isSummariesLoading: boolean;
  onViewDetails: (message: MessageRecord) => void;
  onCopyDraft: (message: MessageRecord) => void;
  onRetryFailed: (message: MessageRecord) => void;
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
  onNewMessage: () => void;
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
  statusFilter,
  onStatusFilterChange,
  summaries,
  isSummariesLoading,
  onViewDetails,
  onCopyDraft,
  onRetryFailed,
  onViewRecipients,
  onNewMessage,
  events,
  commSettings,
}: MessageHistoryProps) {
  const [searchTerm, setSearchTerm] = useState(historySearchQuery);
  const hasUnderlyingHistory = history.length > 0 || Boolean(historySearchQuery.trim());

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

  // Source filter
  const sourceFilteredHistory = useMemo(
    () =>
      sourceFilter === 'all'
        ? history
        : history.filter((message) => {
            const mFilters = message.filters as Record<string, unknown>;
            const mType = mFilters?.type as string | undefined;
            const isAutomated = mType?.startsWith('Automated') || mType === 'Attendance Report';
            return sourceFilter === 'automated' ? isAutomated : !isAutomated;
          }),
    [history, sourceFilter]
  );

  // Page-local delivery status filter (operates on what's already loaded)
  const filteredHistory = useMemo(() => {
    if (statusFilter === 'all') return sourceFilteredHistory;
    return sourceFilteredHistory.filter((message) => {
      const displayState = resolveDeliveryDisplayState(message, summaries[message.id]);
      return displayState === statusFilter;
    });
  }, [sourceFilteredHistory, statusFilter, summaries]);

  const columns: ColumnDef<MessageRecord>[] = [
    {
      id: 'date',
      header: 'Date',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{new Date(row.original.created).toLocaleString()}</span>
      ),
      meta: {
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Date',
      },
    },
    {
      id: 'type',
      header: 'Type',
      enableSorting: false,
      cell: ({ row }) => {
        const { mType, isAutomated } = getMessageMeta(row.original);
        return (
          <div className="flex flex-col gap-1">
            <span className="bg-primary-light text-primary-deep inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
              {row.original.type}
            </span>
            {isAutomated && mType && (
              <span className="bg-danger-bg text-danger-text inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase opacity-80">
                {mType}
              </span>
            )}
          </div>
        );
      },
      meta: {
        hideBelow: 'sm',
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Type',
      },
    },
    {
      id: 'subject',
      header: 'Subject',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="block max-w-[250px] truncate font-semibold">
          {getResolvedSubject(row.original)}
        </span>
      ),
      meta: {
        cardSection: 0,
        cardSide: 'left',
      },
    },
    {
      id: 'source',
      header: 'Source',
      enableSorting: false,
      cell: ({ row }) => {
        const { isAutomated } = getMessageMeta(row.original);
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
      meta: {
        hideBelow: 'sm',
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Source',
      },
    },
    {
      id: 'recipients',
      header: 'Recipients',
      enableSorting: false,
      cell: ({ row }) => (
        <button
          type="button"
          className="text-primary hover:text-primary-deep cursor-pointer border-none bg-transparent p-0 text-sm font-semibold underline decoration-dotted underline-offset-2 transition-colors"
          onClick={() =>
            onViewRecipients(
              row.original.recipients,
              `Recipients — ${getResolvedSubject(row.original)}`
            )
          }
        >
          {row.original.recipients.length} recipient
          {row.original.recipients.length !== 1 ? 's' : ''}
        </button>
      ),
      meta: {
        align: 'center',
        cardSection: 1,
        cardSide: 'right',
      },
    },
    {
      id: 'delivery',
      header: 'Delivery',
      enableSorting: false,
      cell: ({ row }) => {
        const summary = summaries[row.original.id];
        const displayState = resolveDeliveryDisplayState(row.original, summary);
        if (isSummariesLoading && !summary && row.original.status !== 'Archived') {
          return <span className="text-text-muted text-xs">Checking…</span>;
        }
        const progress = summary ? formatDeliveryProgress(summary) : undefined;
        return (
          <div className="flex flex-col gap-0.5">
            <DeliveryStatusBadge state={displayState} progress={progress} />
            {progress && displayState !== 'tracking-unavailable' && displayState !== 'archived' && (
              <span className="text-text-muted text-[11px]">{progress}</span>
            )}
          </div>
        );
      },
      meta: {
        cardSection: 0,
        cardSide: 'right',
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const summary = summaries[row.original.id];
        const canRetry =
          summary &&
          summary.total.failed > 0 &&
          !summary.truncated &&
          row.original.status !== 'Archived';
        return (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => onCopyDraft(row.original)}
            >
              Copy to Draft
            </Button>
            {canRetry && (
              <Button
                type="button"
                variant="danger"
                size="small"
                onClick={() => onRetryFailed(row.original)}
              >
                Retry Failed
              </Button>
            )}
          </div>
        );
      },
      meta: {
        align: 'right',
        cardSection: 1,
        cardSide: 'right',
      },
    },
  ];

  const renderMobileCard = (message: MessageRecord) => {
    const { isAutomated } = getMessageMeta(message);
    const resolvedSubject = getResolvedSubject(message);
    const summary = summaries[message.id];
    const displayState = resolveDeliveryDisplayState(message, summary);
    const progress = summary ? formatDeliveryProgress(summary) : undefined;

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-text truncate text-sm font-semibold">{resolvedSubject}</span>
            <div className="flex flex-wrap gap-1">
              <span className="bg-primary-light text-primary-deep inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase">
                {message.type}
              </span>
              {isAutomated && (
                <span className="bg-danger-bg text-danger-text inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase">
                  Automated
                </span>
              )}
            </div>
          </div>
          <DeliveryStatusBadge state={displayState} progress={progress} />
        </div>

        <div className="text-text-muted flex flex-col gap-0.5 text-xs">
          {progress && displayState !== 'tracking-unavailable' && displayState !== 'archived' && (
            <span>{progress}</span>
          )}
          <span>{new Date(message.created).toLocaleString()}</span>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full justify-center"
          onClick={() => onViewDetails(message)}
        >
          Message details
        </Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {hasUnderlyingHistory && (
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-[3]">
            <Input
              aria-label="Search message history"
              type="text"
              placeholder="Search message history (subject, content, type)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={searchTerm ? 'pr-8' : 'pr-3'}
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Clear history search"
                className="text-text-muted absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer border-0 bg-transparent text-xl leading-none"
                onClick={() => {
                  setSearchTerm('');
                  onHistorySearchChange('');
                }}
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
          <Select
            aria-label="Message source"
            value={sourceFilter}
            onChange={(e) => onSourceFilterChange(e.target.value as SourceFilter)}
            className="max-w-[130px]"
          >
            <option value="all">All Sources</option>
            <option value="manual">Manual</option>
            <option value="automated">Automated</option>
          </Select>
          <Select
            aria-label="Delivery status"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as DeliveryStatusFilter)}
            className="max-w-[160px]"
          >
            <option value="all">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="sending">Sending</option>
            <option value="sent">Sent</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
            <option value="archived">Archived</option>
            <option value="tracking-unavailable">Untracked</option>
          </Select>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredHistory}
        isLoading={false}
        emptyState={{
          title: historySearchQuery
            ? `No messages found matching "${historySearchQuery}".`
            : 'No messages logged yet.',
          icon: (
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-muted mx-auto mb-3 opacity-60"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          ),
          action: (
            <Button type="button" variant="primary" onClick={onNewMessage}>
              + New Message
            </Button>
          ),
        }}
        manualPagination
        pagination={{
          pageIndex: Math.max(0, currentPage - 1),
          pageSize: 10,
        }}
        pageCount={totalPages}
        onPaginationChange={(state) => onPageChange(state.pageIndex + 1)}
        onRowClick={(row) => onViewDetails(row)}
        getRowId={(message) => message.id}
        renderMobileCard={renderMobileCard}
      />
    </div>
  );
}
