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
      cell: (_, draft) => (
        <span className="whitespace-nowrap">{new Date(draft.updated).toLocaleString()}</span>
      ),
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Updated',
    },
    {
      id: 'type',
      header: 'Type',
      cell: (_, draft) => (
        <span className="bg-primary-light text-primary-deep inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
          {draft.type}
        </span>
      ),
      cardSection: 0,
      cardSide: 'left',
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: (_, draft) => (
        <span className="max-w-[300px] truncate font-semibold">
          {draft.subject || '(No Subject)'}
        </span>
      ),
      cardSection: 0,
      cardSide: 'right',
    },
    {
      id: 'content',
      header: 'Content',
      cell: (_, draft) => (
        <span className="text-muted max-w-[400px] truncate">
          {draft.content.substring(0, 100)}...
        </span>
      ),
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Preview',
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (_, draft) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="small" onClick={() => onDeleteDraft(draft)}>
            Delete
          </Button>
          <Button variant="primary" size="small" onClick={() => onResumeDraft(draft)}>
            Resume Draft
          </Button>
        </div>
      ),
      cardSection: 1,
      cardSide: 'right',
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
