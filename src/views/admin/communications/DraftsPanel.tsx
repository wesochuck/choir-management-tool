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
    <div className="overflow-x-auto">
      <table className="border-collapse w-full min-w-[700px] text-left">
        <thead>
          <tr className="border-b-2 border-gray-200 text-gray-500 text-sm">
            <th className="p-3 px-4 text-left">Last Updated</th>
            <th className="p-3 px-4 text-left">Type</th>
            <th className="p-3 px-4 text-left">Subject</th>
            <th className="p-3 px-4 text-left">Content</th>
            <th className="p-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {drafts.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center p-8 text-gray-500">
                No saved drafts.
              </td>
            </tr>
          ) : (
            drafts.map((draft) => (
              <tr key={draft.id} className="border-b border-gray-200 text-sm">
                <td className="p-3 px-4 whitespace-nowrap">
                  {new Date(draft.updated).toLocaleString()}
                </td>
                <td className="p-3 px-4">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary-light text-primary-deep w-fit">
                    {draft.type}
                  </span>
                </td>
                <td className="p-3 px-4 font-semibold max-w-[300px] truncate">
                  {draft.subject || '(No Subject)'}
                </td>
                <td className="p-3 px-4 max-w-[400px] truncate text-muted">
                  {draft.content.substring(0, 100)}...
                </td>
                <td className="p-3 px-4 text-right whitespace-nowrap">
                  <div className="flex gap-2 justify-end">
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
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
