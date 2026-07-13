import React from 'react';
import EasyMDE from 'easymde';
import { Button, Modal } from '../../../components/ui';
import { PollSelectionModal } from '../../../components/admin/PollSelectionModal';
import type {
  CommunicationRecipient,
  TemplateRecord,
} from '../../../services/communicationService';
import type { Event } from '../../../services/eventService';
import type { CommunicationSettings } from '../../../services/settingsService';

interface CommunicationModalsProps {
  recipientPreviewList: {
    isOpen: boolean;
    recipients: CommunicationRecipient[];
    title: string;
    emptyMessage?: string;
    helperText?: string;
  };
  setRecipientPreviewList: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      recipients: CommunicationRecipient[];
      title: string;
      emptyMessage?: string;
      helperText?: string;
    }>
  >;
  isPollModalOpen: boolean;
  setIsPollModalOpen: (open: boolean) => void;
  setPollQuestions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  editorRef: React.MutableRefObject<EasyMDE | null>;
  events: Event[];
  commSettings: CommunicationSettings;
  editingTemplate?: Partial<TemplateRecord> | null;
  setEditingTemplate?: React.Dispatch<React.SetStateAction<Partial<TemplateRecord> | null>>;
}

export function CommunicationModals({
  recipientPreviewList,
  setRecipientPreviewList,
  isPollModalOpen,
  setIsPollModalOpen,
  setPollQuestions,
  setContent,
  editorRef,
  editingTemplate,
  setEditingTemplate,
}: CommunicationModalsProps) {
  return (
    <>
      <Modal
        isOpen={recipientPreviewList.isOpen}
        onClose={() => setRecipientPreviewList({ ...recipientPreviewList, isOpen: false })}
        title={recipientPreviewList.title}
        maxWidth="500px"
        footer={
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRecipientPreviewList({ ...recipientPreviewList, isOpen: false })}
          >
            Cancel
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {recipientPreviewList.recipients.length === 0 ? (
            <div className="text-text-muted w-full py-10 text-center">
              <p className="text-muted m-0">
                {recipientPreviewList.emptyMessage || 'No recipients found.'}
              </p>
              {recipientPreviewList.helperText && (
                <p className="text-muted text-xs">{recipientPreviewList.helperText}</p>
              )}
            </div>
          ) : (
            recipientPreviewList.recipients.map((r) => (
              <div
                key={r.id}
                className="border-border bg-bg inline-flex items-center gap-2 rounded-lg border px-3 py-1.5"
              >
                <strong>{r.name}</strong>
                <span className="text-muted text-xs">{r.voicePart}</span>
              </div>
            ))
          )}
        </div>
      </Modal>

      <PollSelectionModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        onSelect={(pollId, pollQuestion) => {
          const tag = `{{POLL_LINK:${pollId}}}`;
          const editor = editorRef.current;

          if (editor) {
            editor.codemirror.replaceSelection(tag);
            editor.codemirror.focus();
          } else {
            if (editingTemplate && setEditingTemplate) {
              setEditingTemplate({
                ...editingTemplate,
                content: (editingTemplate.content || '') + tag,
              });
            } else {
              setContent((prev) => prev + tag);
            }
          }

          setPollQuestions((prev) => ({ ...prev, [pollId]: pollQuestion }));
          setIsPollModalOpen(false);
        }}
      />
    </>
  );
}
