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
