import { Button, DataTable, type ColumnDef } from '../../../components/ui';
import type { MessageRecord } from '../../../services/communicationService';

interface DraftsPanelProps {
  drafts: MessageRecord[];
  onResumeDraft: (draft: MessageRecord) => void;
  onDeleteDraft: (draft: MessageRecord) => Promise<void>;
}

export function DraftsPanel({ drafts, onResumeDraft, onDeleteDraft }: DraftsPanelProps) {
  const columns: ColumnDef<MessageRecord>[] = [
    {
      id: 'updated',
      header: 'Last Updated',
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{new Date(row.original.updated).toLocaleString()}</span>
      ),
      meta: {
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Updated',
      },
    },
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
      header: 'Subject',
      cell: ({ row }) => (
        <span className="max-w-[300px] truncate font-semibold">
          {row.original.subject || '(No Subject)'}
        </span>
      ),
      meta: {
        cardSection: 0,
        cardSide: 'right',
      },
    },
    {
      id: 'content',
      header: 'Content',
      cell: ({ row }) => (
        <span className="text-muted max-w-[400px] truncate">
          {row.original.content.substring(0, 100)}...
        </span>
      ),
      meta: {
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Preview',
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="small" onClick={() => onDeleteDraft(row.original)}>
            Delete
          </Button>
          <Button variant="primary" size="small" onClick={() => onResumeDraft(row.original)}>
            Resume Draft
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

  return (
    <DataTable
      columns={columns}
      data={drafts}
      isLoading={false}
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
      }}
      hidePagination
    />
  );
}
