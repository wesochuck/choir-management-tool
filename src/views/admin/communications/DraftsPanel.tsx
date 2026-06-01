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
        <div key={draft.id} className="message-list-item flex-responsive">
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
              <span className="badge badge-rehearsal">{draft.type}</span>
              <span className="text-muted text-xs">
                Last updated: {new Date(draft.updated).toLocaleString()}
              </span>
            </div>
            <h3 style={{ margin: 0 }}>{draft.subject || '(No Subject)'}</h3>
            <p className="text-muted text-sm">
              {draft.content.substring(0, 100)}...
            </p>
          </div>
          <div className="flex-row">
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
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p className="text-muted">No saved drafts.</p>
        </div>
      )}
    </AppCard>
  );
}
