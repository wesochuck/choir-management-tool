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
  };
  setRecipientPreviewList: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      recipients: CommunicationRecipient[];
      title: string;
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
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <div className="flex-col" style={{ gap: '2px' }}>
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
            <div className="flex-col" style={{ gap: '2px' }}>
              <label className="text-label text-muted">Sent To</label>
              <span>
                {selectedMessage.status === 'Archived'
                  ? 'No recipients because this message was archived before dispatch.'
                  : `${selectedMessage.recipients.length} recipients`}
              </span>
            </div>
            {selectedMessage.status === 'Archived' && (
              <div
                className="card"
                style={{
                  padding: '12px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fcd34d',
                  color: '#92400e',
                  fontSize: '0.875rem',
                }}
              >
                <strong>Archived:</strong> This automated message was archived without sending.
              </div>
            )}
            <div className="flex-col" style={{ gap: '2px' }}>
              <label className="text-label text-muted">Content</label>
              <div
                className="card"
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  whiteSpace: 'pre-wrap',
                }}
              >
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
        <div
          className="flex-col"
          style={{ gap: 'var(--space-sm)', maxHeight: '400px', overflowY: 'auto' }}
        >
          {recipientPreviewList.recipients.map((r) => (
            <div
              key={r.id}
              className="flex-row card"
              style={{ padding: 'var(--space-sm)', justifyContent: 'space-between', boxShadow: 'none' }}
            >
              <strong>{r.name}</strong>
              <span className="text-muted text-xs">{r.voicePart}</span>
            </div>
          ))}
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
