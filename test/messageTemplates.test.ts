import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCommunicationTemplate } from '../src/lib/messageTemplates.ts';

test('renderCommunicationTemplate - preserves literal replacement values with dollar signs', () => {
  const result = renderCommunicationTemplate('Title: {eventTitle}', {
    eventTitle: 'Fundraiser: $50 & Dinner',
  });
  assert.equal(result, 'Title: Fundraiser: $50 & Dinner');
});

test('renderCommunicationTemplate - preserves literal replacement values with dollar signs and replacement sequences', () => {
  const result = renderCommunicationTemplate('Title: {eventTitle}', {
    eventTitle: 'Literal $& and $1',
  });
  assert.equal(result, 'Title: Literal $& and $1');
});

test('renderCommunicationTemplate - multiple placeholders still render', () => {
  const result = renderCommunicationTemplate('Hello {firstName} {lastName}!', {
    firstName: 'John',
    lastName: 'Doe',
  });
  assert.equal(result, 'Hello John Doe!');
});

test('renderCommunicationTemplate - unknown placeholders remain unchanged', () => {
  const result = renderCommunicationTemplate('Hello {firstName} {lastName} {middleName}!', {
    firstName: 'John',
    lastName: 'Doe',
  });
  assert.equal(result, 'Hello John Doe {middleName}!');
});
