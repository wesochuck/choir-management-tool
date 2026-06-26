// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { TemplateStep } from '../../../../src/views/admin/communications/TemplateStep';
import type { TemplateRecord } from '../../../../src/services/communicationService';

const mockTemplates: TemplateRecord[] = [
  {
    id: 'tpl-1',
    title: 'Rehearsal Reminder',
    subject: 'Rehearsal Tomorrow',
    content: 'Hi {singerName}, rehearsal is at 7pm.',
    type: 'Email',
    isSystemTemplate: true,
  } as unknown as TemplateRecord,
];

function makeTemplateSelection(
  overrides: Partial<{
    selectedTemplateId: string | null;
    setSelectedTemplateId: (id: string | null) => void;
    handleUseTemplate: (id: string) => void;
  }> = {}
) {
  const setSelectedTemplateId = overrides.setSelectedTemplateId ?? mock.fn();
  const handleUseTemplate = overrides.handleUseTemplate ?? mock.fn();
  return {
    selectedTemplateId: overrides.selectedTemplateId ?? 'blank',
    setSelectedTemplateId,
    handleUseTemplate,
  };
}

function buttonLabels(): string[] {
  return screen.getAllByRole('button').map((b) => b.textContent ?? '');
}

describe('TemplateStep', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the template selection UI without a separate Start / Continue button', () => {
    render(
      <TemplateStep
        templates={mockTemplates}
        templateSelection={makeTemplateSelection()}
        onBack={mock.fn()}
      />
    );

    assert.ok(screen.getByText('Step 2: Choose how to start your message'));
    const labels = buttonLabels();
    assert.equal(
      labels.some((l) => l.includes('Start Blank Message')),
      false,
      'should not render a Start Blank Message button'
    );
    assert.equal(
      labels.some((l) => l.includes('Use Template & Continue')),
      false,
      'should not render a Use Template & Continue button'
    );
  });

  it('calls handleUseTemplate with the selected id when a template card is clicked', () => {
    const handleUseTemplate = mock.fn();
    render(
      <TemplateStep
        templates={mockTemplates}
        templateSelection={makeTemplateSelection({ handleUseTemplate })}
        onBack={mock.fn()}
      />
    );

    fireEvent.click(screen.getByText('Rehearsal Reminder'));

    assert.strictEqual(handleUseTemplate.mock.callCount(), 1);
    assert.strictEqual(handleUseTemplate.mock.calls[0].arguments[0], 'tpl-1');
  });

  it('calls handleUseTemplate with "blank" when the blank template is clicked', () => {
    const handleUseTemplate = mock.fn();
    render(
      <TemplateStep
        templates={mockTemplates}
        templateSelection={makeTemplateSelection({ handleUseTemplate })}
        onBack={mock.fn()}
      />
    );

    fireEvent.click(screen.getByText('Blank Message'));

    assert.strictEqual(handleUseTemplate.mock.callCount(), 1);
    assert.strictEqual(handleUseTemplate.mock.calls[0].arguments[0], 'blank');
  });

  it('does not call handleUseTemplate on initial render', () => {
    const handleUseTemplate = mock.fn();
    render(
      <TemplateStep
        templates={mockTemplates}
        templateSelection={makeTemplateSelection({ handleUseTemplate })}
        onBack={mock.fn()}
      />
    );

    assert.strictEqual(handleUseTemplate.mock.callCount(), 0);
  });

  it('calls onBack when the back button is clicked', () => {
    const onBack = mock.fn();
    render(
      <TemplateStep
        templates={mockTemplates}
        templateSelection={makeTemplateSelection()}
        onBack={onBack}
      />
    );

    const backButtons = screen.getAllByRole('button', { name: /Back to Audience/i });
    fireEvent.click(backButtons[0]!);

    assert.strictEqual(onBack.mock.callCount(), 1);
  });
});
