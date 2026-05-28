import React from 'react';

export interface ValidationWarning {
  field: string;
  message: string;
  type: 'warning' | 'error';
}

export const checkValidation = (
  messageBody: string,
  subject: string,
  currentChannel: 'Email' | 'SMS' | 'Both',
  selectedEventId: string
): ValidationWarning[] => {
  const warnings: ValidationWarning[] = [];
  
  const eventPlaceholders = [
    '{eventTitle}',
    '{eventType}',
    '{eventDate}',
    '{eventLocation}',
    '{eventDetails}',
    '{playerLink}',
    '{rsvpLinks}'
  ];

  if ((currentChannel === 'Email' || currentChannel === 'Both') && !subject.trim()) {
    warnings.push({
      field: 'subject',
      message: 'Subject line required for email messages.',
      type: 'error',
    });
  }

  const hasPlaceholder = eventPlaceholders.some(placeholder => 
    messageBody.toLowerCase().includes(placeholder.toLowerCase()) || 
    subject.toLowerCase().includes(placeholder.toLowerCase())
  );

  if (hasPlaceholder && !selectedEventId) {
    warnings.push({
      field: 'body',
      message: 'This message uses event placeholders, but no event context is selected.',
      type: 'warning',
    });
  }

  return warnings;
};

interface ComposeStepProps {
  subject: string;
  onSubjectChange: (val: string) => void;
  messageType: 'Email' | 'SMS' | 'Both';
  onMessageTypeChange: (val: 'Email' | 'SMS' | 'Both') => void;
  content: string;
  onContentChange: (val: string) => void;
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
  warnings: ValidationWarning[];
}

export const ComposeStep: React.FC<ComposeStepProps> = ({
  subject,
  onSubjectChange,
  messageType,
  onMessageTypeChange,
  content,
  onContentChange,
  textAreaRef,
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
        <textarea
          ref={textAreaRef}
          className={`card composer-textarea ${bodyWarning ? 'border-warning' : ''}`}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Compose your message here..."
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
