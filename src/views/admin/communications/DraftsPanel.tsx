import { Button, DataTable, type ColumnDef } from '../../../components/ui';
import type { MessageRecord } from '../../../services/communicationService';

interface DraftsPanelProps {
  drafts: MessageRecord[];
  onResumeDraft: (draft: MessageRecord, options?: { asCopy?: boolean }) => void;
  onDeleteDraft: (draft: MessageRecord) => Promise<void>;
  onStartNew?: () => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3600_000);
  const diffDays = Math.floor(diffMs / 86400_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export function DraftsPanel({
  drafts,
  onResumeDraft,
  onDeleteDraft,
  onStartNew,
}: DraftsPanelProps) {
  const columns: ColumnDef<MessageRecord>[] = [
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="bg-primary-light text-primary-deep inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
          {row.original.type}
        </span>
      ),
      meta: {
        cardSection: 0,
        cardSide: 'left',
      },
    },
    {
      id: 'subject',
      header: 'Draft Details',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-text max-w-[400px] truncate font-semibold">
            {row.original.subject || '(No Subject)'}
          </span>
          {row.original.content && (
            <span className="text-text-muted line-clamp-2 max-w-[400px] text-xs whitespace-normal">
              {row.original.content}
            </span>
          )}
        </div>
      ),
      meta: {
        cardSection: 0,
        cardSide: 'right',
      },
    },
    {
      id: 'updated',
      header: 'Last Updated',
      cell: ({ row }) => (
        <span className="text-text-muted text-xs whitespace-nowrap">
          {formatRelativeTime(row.original.updated)}
        </span>
      ),
      meta: {
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Updated',
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="small"
            onClick={() => onResumeDraft(row.original, { asCopy: true })}
          >
            Save as copy
          </Button>
          <Button
            variant="outline"
            size="small"
            className="hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
            onClick={() => onDeleteDraft(row.original)}
          >
            Delete
          </Button>
          <Button variant="primary" size="small" onClick={() => onResumeDraft(row.original)}>
            Resume
          </Button>
        </div>
      ),
      meta: {
        align: 'right',
        cardSection: 1,
        cardSide: 'right',
      },
    },
  ];

  const renderMobileCard = (draft: MessageRecord) => {
    return (
      <div className="bg-surface border-border flex flex-col gap-3 rounded-xl border p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="bg-primary-light text-primary-deep inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
            {draft.type}
          </span>
          <span className="text-text-muted text-xs">{formatRelativeTime(draft.updated)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-text truncate text-base font-semibold">
            {draft.subject || '(No Subject)'}
          </h4>
          {draft.content && <p className="text-text-muted line-clamp-2 text-sm">{draft.content}</p>}
        </div>
        <div className="border-border/60 flex items-center justify-end gap-2 border-t pt-2">
          <Button
            variant="outline"
            size="small"
            onClick={() => onResumeDraft(draft, { asCopy: true })}
          >
            Save as copy
          </Button>
          <Button
            variant="outline"
            size="small"
            className="hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
            onClick={() => onDeleteDraft(draft)}
          >
            Delete
          </Button>
          <Button variant="primary" size="small" onClick={() => onResumeDraft(draft)}>
            Resume
          </Button>
        </div>
      </div>
    );
  };

  return (
    <DataTable
      columns={columns}
      data={drafts}
      isLoading={false}
      renderMobileCard={renderMobileCard}
      emptyState={{
        title: 'No saved drafts.',
        icon: (
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-muted"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
        action: onStartNew ? (
          <Button variant="primary" onClick={onStartNew}>
            + Create New Draft
          </Button>
        ) : undefined,
      }}
      hidePagination
    />
  );
}
