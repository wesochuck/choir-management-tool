import { Button } from '../../../components/ui';
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
      <table className="w-full min-w-[700px] border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-gray-200 text-sm text-gray-500">
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
              <td colSpan={5} className="p-8 text-center text-gray-500">
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
                  <span className="inline-flex w-fit items-center rounded bg-primary-light px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-primary-deep uppercase">
                    {draft.type}
                  </span>
                </td>
                <td className="max-w-[300px] truncate p-3 px-4 font-semibold">
                  {draft.subject || '(No Subject)'}
                </td>
                <td className="text-muted max-w-[400px] truncate p-3 px-4">
                  {draft.content.substring(0, 100)}...
                </td>
                <td className="p-3 px-4 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => onDeleteDraft(draft)}
                    >
                      Delete
                    </Button>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => onResumeDraft(draft)}
                    >
                      Resume Draft
                    </Button>
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
