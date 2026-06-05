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
    <div className="composer-form comm-compose-form">
      <div className="comm-compose-header-row">
        <div className="composer-subject-field comm-compose-field">
          <label className="text-label">Subject</label>
          <input
            className={`card comm-compose-input ${subjectWarning ? 'border-error' : ''}`}
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            disabled={messageType === 'SMS'}
            placeholder={messageType === 'SMS' ? 'Subject not supported for SMS' : 'Enter subject...'}
          />
          {subjectWarning && (
            <span className="comm-validation-error">
              ⚠️ {subjectWarning.message}
            </span>
          )}
        </div>
        <div className="composer-channel-field comm-compose-field">
          <label className="text-label">Channel</label>
          <select
            className="card comm-compose-input"
            value={messageType}
            onChange={(e) => onMessageTypeChange(e.target.value as 'Email' | 'SMS' | 'Both')}
          >
            <option value="Email">Email</option>
            <option value="SMS">SMS</option>
            <option value="Both">Both</option>
          </select>
        </div>
      </div>
      <div className="comm-compose-field">
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
          <span className="comm-validation-warning">
            ⚠️ {bodyWarning.message}
          </span>
        )}
      </div>
    </div>
  );
};

