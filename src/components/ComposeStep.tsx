import React from 'react';
import { MarkdownEditor } from './common/MarkdownEditor';
import EasyMDE from 'easymde';

import { type ValidationWarning } from '../utils/communicationValidation';

interface ComposeStepProps {
  subject: string;
  onSubjectChange: (val: string) => void;
  messageType: 'Email' | 'SMS' | 'Both';
  onMessageTypeChange: (val: 'Email' | 'SMS' | 'Both') => void;
  content: string;
  onContentChange: (val: string) => void;
  editorRef: React.MutableRefObject<EasyMDE | null>;
  warnings: ValidationWarning[];
}

export const ComposeStep: React.FC<ComposeStepProps> = ({
  subject,
  onSubjectChange,
  messageType,
  onMessageTypeChange,
  content,
  onContentChange,
  editorRef,
  warnings,
}) => {
  const subjectWarning = warnings.find(w => w.field === 'subject');
  const bodyWarning = warnings.find(w => w.field === 'body');

  return (
    <div className="composer-form flex-col gap-4">
      <div className="flex-row flex-wrap items-center gap-2">
        <div className="composer-subject-field flex flex-col gap-1">
          <label className="text-label">Subject</label>
          <input
            className={`card ${subjectWarning ? 'border-error' : ''}`}
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            disabled={messageType === 'SMS'}
            placeholder={messageType === 'SMS' ? 'Subject not supported for SMS' : 'Enter subject...'}
          />
          {subjectWarning && (
            <span className="mt-1 text-xs text-danger-text">
              ⚠️ {subjectWarning.message}
            </span>
          )}
        </div>
        <div className="composer-channel-field flex flex-col gap-1">
          <label className="text-label">Channel</label>
          <select
            className="card"
            value={messageType}
            onChange={(e) => onMessageTypeChange(e.target.value as 'Email' | 'SMS' | 'Both')}
          >
            <option value="Email">Email</option>
            <option value="SMS">SMS</option>
            <option value="Both">Both</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-label">Message Body (Markdown Supported)</label>
        <MarkdownEditor
          instanceRef={editorRef}
          className={bodyWarning ? 'border-warning' : ''}
          value={content}
          onChange={onContentChange}
          placeholder="Compose your message here..."
          minHeight="350px"
        />
        {bodyWarning && (
          <span className="mt-1 text-xs text-amber-600">
            ⚠️ {bodyWarning.message}
          </span>
        )}
      </div>
    </div>
  );
};

