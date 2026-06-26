// @vitest-environment jsdom
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

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
    handleUseTemplate: () => void;
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

describe('TemplateStep', () => {
  it('renders the template selection UI', () => {
    render(
      <TemplateStep
        templates={mockTemplates}
        templateSelection={makeTemplateSelection()}
        onBack={mock.fn()}
      />
    );

    assert.ok(screen.getByText('Step 2: Choose how to start your message'));
    assert.ok(screen.getByRole('button', { name: /Start Blank Message/i }));
  });

  it('shows "Use Template & Continue" when a template is selected', () => {
    render(
      <TemplateStep
        templates={mockTemplates}
        templateSelection={makeTemplateSelection({ selectedTemplateId: 'tpl-1' })}
        onBack={mock.fn()}
      />
    );

    assert.ok(screen.getByRole('button', { name: /Use Template & Continue/i }));
  });

  it('calls handleUseTemplate when the primary button is clicked', () => {
    const handleUseTemplate = mock.fn();
    render(
      <TemplateStep
        templates={mockTemplates}
        templateSelection={makeTemplateSelection({ handleUseTemplate })}
        onBack={mock.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Start Blank Message/i }));

    assert.strictEqual(handleUseTemplate.mock.callCount(), 1);
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
