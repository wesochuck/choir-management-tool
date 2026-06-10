import React from 'react';
import EasyMDE from 'easymde';
import { BaseModal } from '../../../components/common/BaseModal';
import { PollSelectionModal } from '../../../components/admin/PollSelectionModal';
import type {
  MessageRecord,
  CommunicationRecipient,
  TemplateRecord,
} from '../../../services/communicationService';
import type { Event } from '../../../services/eventService';
import type { CommunicationSettings } from '../../../services/settingsService';
import { resolvePreviewContent } from '../../../lib/communicationUtils';

interface CommunicationModalsProps {
  selectedMessage: MessageRecord | null;
  setSelectedMessage: (msg: MessageRecord | null) => void;
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
  setEditingTemplate?: React.Dispatch<
    React.SetStateAction<Partial<TemplateRecord> | null>
  >;
}

export function CommunicationModals({
  selectedMessage,
  setSelectedMessage,
  recipientPreviewList,
  setRecipientPreviewList,
  isPollModalOpen,
  setIsPollModalOpen,
  setPollQuestions,
  setContent,
  editorRef,
  events,
  commSettings,
  editingTemplate,
  setEditingTemplate,
}: CommunicationModalsProps) {
  return (
    <>
      <BaseModal
        isOpen={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        title="Message Details"
        maxWidth="600px"
        footer={
          <button className="btn btn-secondary" onClick={() => setSelectedMessage(null)}>
            Cancel
          </button>
        }
      >
        {selectedMessage && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label text-muted">Subject</label>
              <strong>
                {(() => {
                  const mFilters = selectedMessage.filters as Record<string, unknown>;
                  const eventId = mFilters?.eventId as string | undefined;
                  const linkedEvent = events.find((e) => e.id === eventId) || null;
                  return resolvePreviewContent(
                    selectedMessage.subject || '(SMS)',
                    linkedEvent,
                    null,
                    commSettings.mailingAddress
                  );
                })()}
              </strong>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label text-muted">Sent To</label>
              <span>
                {selectedMessage.status === 'Archived'
                  ? 'No recipients because this message was archived before dispatch.'
                  : `${selectedMessage.recipients.length} recipients`}
              </span>
            </div>
            {selectedMessage.status === 'Archived' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <strong>Archived:</strong> This automated message was archived without sending.
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-label text-muted">Content</label>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-border bg-bg p-4">
                {selectedMessage.content}
              </div>
            </div>
          </div>
        )}
      </BaseModal>

      <BaseModal
        isOpen={recipientPreviewList.isOpen}
        onClose={() => setRecipientPreviewList({ ...recipientPreviewList, isOpen: false })}
        title={recipientPreviewList.title}
        maxWidth="500px"
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRecipientPreviewList({ ...recipientPreviewList, isOpen: false })}
          >
            Cancel
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {recipientPreviewList.recipients.length === 0 ? (
            <div className="w-full py-10 text-center text-text-muted">
              <p className="text-muted m-0">
                {recipientPreviewList.emptyMessage || 'No recipients found.'}
              </p>
              {recipientPreviewList.helperText && (
                <p className="text-muted text-xs">
                  {recipientPreviewList.helperText}
                </p>
              )}
            </div>
          ) : (
            recipientPreviewList.recipients.map((r) => (
              <div
                key={r.id}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-1.5"
              >
                <strong>{r.name}</strong>
                <span className="text-muted text-xs">{r.voicePart}</span>
              </div>
            ))
          )}
        </div>
      </BaseModal>

      <PollSelectionModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        onSelect={(pollId, pollQuestion) => {
          const tag = `{{POLL_LINK:${pollId}}}`;
          const editor = editorRef.current;

          if (editor) {
            editor.codemirror.replaceSelection(tag);
            editor.codemirror.focus();
            // onChange handler in MarkdownEditor will trigger setContent/setEditingTemplate
          } else {
            // Fallback
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
