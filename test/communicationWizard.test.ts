import test from 'node:test';
import assert from 'node:assert/strict';
import { checkValidation } from '../src/components/ComposeStep.tsx';

test('checkValidation validation rules', () => {
  // Rule 1: Subject line required for email channel
  const warningsEmailEmptySubject = checkValidation('Hello {singerName}', '', 'Email', 'event123');
  const subjectError = warningsEmailEmptySubject.find(w => w.field === 'subject');
  assert.ok(subjectError);
  assert.equal(subjectError.type, 'error');
  assert.equal(subjectError.message, 'Subject line required for email messages.');

  // Rule 2: Warning if event placeholder is used but no event context is selected
  const warningsPlaceholderNoEvent = checkValidation('Hello {singerName}, here is the date: {eventDate}', 'Subject Line', 'Email', '');
  const placeholderWarning = warningsPlaceholderNoEvent.find(w => w.field === 'body');
  assert.ok(placeholderWarning);
  assert.equal(placeholderWarning.type, 'warning');
  assert.equal(placeholderWarning.message, 'This message uses event placeholders, but no event context is selected.');

  // Rule 3: SMS channel does not require a subject
  const warningsSmsEmptySubject = checkValidation('Hello World', '', 'SMS', '');
  const smsSubjectError = warningsSmsEmptySubject.find(w => w.field === 'subject');
  assert.ok(!smsSubjectError);

  // Rule 4: No warnings or errors when all data is valid
  const cleanWarnings = checkValidation('Hello World', 'Valid Subject', 'Email', 'event123');
  assert.equal(cleanWarnings.length, 0);
});
