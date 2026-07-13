// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
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
    selectedTemplateId: string;
    setSelectedTemplateId: (id: string) => void;
    handleUseTemplate: () => void;
  }> = {}
) {
  const setSelectedTemplateId = (overrides.setSelectedTemplateId ?? mock.fn()) as (
    id: string
  ) => void;
  const handleUseTemplate = (overrides.handleUseTemplate ?? mock.fn()) as () => void;
  return {
    selectedTemplateId: overrides.selectedTemplateId ?? 'blank',
    setSelectedTemplateId,
    handleUseTemplate,
  };
}

describe('TemplateStep', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the template selection UI with heading', () => {
    render(
      <TemplateStep
        templates={mockTemplates}
        templateSelection={makeTemplateSelection()}
        onBack={mock.fn()}
      />
    );

    assert.ok(screen.getByRole('heading', { name: /Step 2: Choose how to start your message/i }));
  });

  it('calls setSelectedTemplateId and not handleUseTemplate when a template card is clicked', () => {
    const handleUseTemplate = mock.fn();
    const setSelectedTemplateId = mock.fn();
    render(
      <TemplateStep
        templates={mockTemplates}
        templateSelection={makeTemplateSelection({ handleUseTemplate, setSelectedTemplateId })}
        onBack={mock.fn()}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: /Rehearsal Reminder/i }));

    assert.strictEqual(handleUseTemplate.mock.callCount(), 0);
    assert.strictEqual(setSelectedTemplateId.mock.callCount(), 1);
    assert.strictEqual(setSelectedTemplateId.mock.calls[0].arguments[0], 'tpl-1');
  });

  it('calls setSelectedTemplateId and not handleUseTemplate when the blank template is clicked', () => {
    const handleUseTemplate = mock.fn();
    const setSelectedTemplateId = mock.fn();
    render(
      <TemplateStep
        templates={mockTemplates}
        templateSelection={makeTemplateSelection({ handleUseTemplate, setSelectedTemplateId })}
        onBack={mock.fn()}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: /Blank Message/i }));

    assert.strictEqual(handleUseTemplate.mock.callCount(), 0);
    assert.strictEqual(setSelectedTemplateId.mock.callCount(), 1);
    assert.strictEqual(setSelectedTemplateId.mock.calls[0].arguments[0], 'blank');
  });

  it('calls handleUseTemplate once when the use button is clicked', () => {
    const handleUseTemplate = mock.fn();
    render(
      <TemplateStep
        templates={mockTemplates}
        templateSelection={makeTemplateSelection({ handleUseTemplate })}
        onBack={mock.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Use blank message/i }));

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

    const backButton = screen.getByRole('button', { name: /Back to Audience/i });
    fireEvent.click(backButton);

    assert.strictEqual(onBack.mock.callCount(), 1);
  });
});
