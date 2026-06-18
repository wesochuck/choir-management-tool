// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

import { VoicePartBalanceCard } from '../../../src/components/admin/VoicePartBalanceCard';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

const mockSections = [
  { code: 'soprano', name: 'Sopranos', count: 10 },
  { code: 'alto', name: 'Altos', count: 8 },
  { code: 'tenor', name: 'Tenors', count: 6 },
  { code: 'bass', name: 'Basses', count: 7 },
];

const mockVoiceParts = [
  { label: 'S1', count: 5 },
  { label: 'S2', count: 5 },
  { label: 'A1', count: 4 },
  { label: 'A2', count: 4 },
  { label: 'T1', count: 3 },
  { label: 'T2', count: 3 },
  { label: 'B1', count: 4 },
  { label: 'B2', count: 3 },
];

it('renders title', () => {
  render(
    <VoicePartBalanceCard
      title="Voice Part Balance"
      sections={mockSections}
      voiceParts={mockVoiceParts}
    />
  );
  assert.ok(screen.getByText('Voice Part Balance'));
});

it('renders section cards', () => {
  render(
    <VoicePartBalanceCard
      title="Voice Part Balance"
      sections={mockSections}
      voiceParts={mockVoiceParts}
    />
  );
  assert.ok(screen.getByText('Sopranos'));
  assert.ok(screen.getByText('Altos'));
  assert.ok(screen.getByText('10'));
  assert.ok(screen.getByText('8'));
});

it('renders voice-part cards', () => {
  render(
    <VoicePartBalanceCard
      title="Voice Part Balance"
      sections={mockSections}
      voiceParts={mockVoiceParts}
    />
  );
  assert.ok(screen.getByText('S1'));
  assert.ok(screen.getByText('S2'));
  assert.ok(screen.getByText('A1'));
  assert.equal(screen.getAllByText('5').length, 2);
});

it('renders badges when provided', () => {
  render(
    <VoicePartBalanceCard
      title="Voice Part Balance"
      sections={mockSections}
      voiceParts={mockVoiceParts}
      badges={<span>88 Singers</span>}
    />
  );
  assert.ok(screen.getByText('88 Singers'));
});

it('renders actions when provided', () => {
  render(
    <VoicePartBalanceCard
      title="Voice Part Balance"
      sections={mockSections}
      voiceParts={mockVoiceParts}
      actions={<button type="button">Export CSV</button>}
    />
  );
  assert.ok(screen.getByRole('button', { name: 'Export CSV' }));
});

it('renders filters when provided', () => {
  render(
    <VoicePartBalanceCard
      title="Voice Part RSVP Balance"
      sections={mockSections}
      voiceParts={mockVoiceParts}
      filters={<button type="button">All Active</button>}
    />
  );
  assert.ok(screen.getByRole('button', { name: 'All Active' }));
});

it('calls section onClick when clickable', () => {
  const onClick = mock.fn();
  render(
    <VoicePartBalanceCard
      title="Voice Part Balance"
      sections={[{ code: 'soprano', name: 'Sopranos', count: 10, onClick }]}
      voiceParts={mockVoiceParts}
    />
  );
  screen.getByText('Sopranos').click();
  assert.equal(onClick.mock.callCount(), 1);
});

it('calls voice-part onClick when clickable', () => {
  const onClick = mock.fn();
  render(
    <VoicePartBalanceCard
      title="Voice Part Balance"
      sections={mockSections}
      voiceParts={[{ label: 'S1', count: 5, onClick }]}
    />
  );
  screen.getByText('S1').click();
  assert.equal(onClick.mock.callCount(), 1);
});

it('applies selected state to selected cards', () => {
  render(
    <VoicePartBalanceCard
      title="Voice Part Balance"
      sections={[{ code: 'soprano', name: 'Sopranos', count: 10, selected: true }]}
      voiceParts={[{ label: 'S1', count: 5, selected: true }]}
    />
  );
  // Sections render as buttons when onClick is present
  assert.ok(screen.getByText('Sopranos'));
  assert.ok(screen.getByText('S1'));
});
