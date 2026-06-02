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
    <div className="composer-form flex-col" style={{ gap: 'var(--space-md)' }}>
      <div className="composer-header-row">
        <div className="composer-subject-field flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Subject</label>
          <input
            className={`card ${subjectWarning ? 'border-error' : ''}`}
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            style={{ height: '44px', padding: '0 12px' }}
            disabled={messageType === 'SMS'}
            placeholder={messageType === 'SMS' ? 'Subject not supported for SMS' : 'Enter subject...'}
          />
          {subjectWarning && (
            <span className="validation-error-text" style={{ color: 'var(--error, #ef4444)', fontSize: '12px', marginTop: '2px' }}>
              ⚠️ {subjectWarning.message}
            </span>
          )}
        </div>
        <div className="composer-channel-field flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Channel</label>
          <select
            className="card"
            value={messageType}
            onChange={(e) => onMessageTypeChange(e.target.value as 'Email' | 'SMS' | 'Both')}
            style={{ height: '44px', padding: '0 12px' }}
          >
            <option value="Email">Email</option>
            <option value="SMS">SMS</option>
            <option value="Both">Both</option>
          </select>
        </div>
      </div>
      <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
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
          <span className="validation-warning-text" style={{ color: 'var(--warning, #f59e0b)', fontSize: '12px', marginTop: '2px' }}>
            ⚠️ {bodyWarning.message}
          </span>
        )}
      </div>
    </div>
  );
};

