import { AppCard } from '../../../components/common/AppCard';
import type { MessageRecord } from '../../../services/communicationService';
import './Communications.css';

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
        <div key={draft.id} className="comm-message-item flex-responsive">
          <div className="comm-message-info">
            <div className="comm-message-meta">
              <span className="badge badge-rehearsal comm-message-badge">{draft.type}</span>
              <span className="text-muted text-xs">
                Last updated: {new Date(draft.updated).toLocaleString()}
              </span>
            </div>
            <h3 className="comm-message-subject">{draft.subject || '(No Subject)'}</h3>
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
        <div className="comm-drafts-empty">
          <p className="text-muted">No saved drafts.</p>
        </div>
      )}
    </AppCard>
  );
}
