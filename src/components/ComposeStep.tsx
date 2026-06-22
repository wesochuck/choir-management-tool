import React from 'react';
import { MarkdownEditor } from './common/MarkdownEditor';
import { Select, Input, FormField } from './ui';
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
  const subjectWarning = warnings.find((w) => w.field === 'subject');
  const bodyWarning = warnings.find((w) => w.field === 'body');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row flex-wrap items-start gap-4">
        <div className="max-w-md min-w-[280px] flex-1">
          <FormField label="Subject" error={subjectWarning?.message}>
            <Input
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              disabled={messageType === 'SMS'}
              placeholder={
                messageType === 'SMS' ? 'Subject not supported for SMS' : 'Enter subject...'
              }
            />
          </FormField>
        </div>
        <div className="w-44">
          <FormField label="Channel">
            <Select
              value={messageType}
              onChange={(e) => onMessageTypeChange(e.target.value as 'Email' | 'SMS' | 'Both')}
            >
              <option value="Email">Email</option>
              <option value="SMS">SMS</option>
              <option value="Both">Both</option>
            </Select>
          </FormField>
        </div>
      </div>
      <FormField label="Message Body (Markdown Supported)">
        <MarkdownEditor
          instanceRef={editorRef}
          className={bodyWarning ? 'border-amber-200' : ''}
          value={content}
          onChange={onContentChange}
          placeholder="Compose your message here..."
          minHeight="350px"
        />
        {bodyWarning && (
          <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-600">
            <span aria-hidden="true">⚠️</span> {bodyWarning.message}
          </span>
        )}
      </FormField>
    </div>
  );
};
