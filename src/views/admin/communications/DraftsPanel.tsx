import { AppCard } from '../../../components/common/AppCard';
import type { MessageRecord } from '../../../services/communicationService';

interface DraftsPanelProps {
  drafts: MessageRecord[];
  onResumeDraft: (draft: MessageRecord) => void;
  onDeleteDraft: (draft: MessageRecord) => Promise<void>;
}

export function DraftsPanel({
  drafts,
  onResumeDraft,
  onDeleteDraft,
}: DraftsPanelProps) {
  return (
    <AppCard noPadding>
      {drafts.map((draft) => (
        <div key={draft.id} className="p-3 border-b border-border flex flex-col md:flex-row last:border-b-0 justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex gap-2 items-center">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary-light text-primary-deep">{draft.type}</span>
              <span className="text-muted text-xs">
                Last updated: {new Date(draft.updated).toLocaleString()}
              </span>
            </div>
            <h3 className="m-0 text-sm font-bold">{draft.subject || '(No Subject)'}</h3>
            <p className="text-muted text-sm">
              {draft.content.substring(0, 100)}...
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onDeleteDraft(draft)}
            >
              Delete
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onResumeDraft(draft)}
            >
              Resume Draft
            </button>
          </div>
        </div>
      ))}
      {drafts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-text-muted">
          <p className="text-muted">No saved drafts.</p>
        </div>
      )}
    </AppCard>
  );
}
