// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TemplateGrid } from '../../src/components/TemplateGrid';
import type { MessageTemplate } from '../../src/types/Communication';

afterEach(() => cleanup());

const templates: MessageTemplate[] = [
  {
    id: 'custom-old',
    title: 'Old Custom',
    description: '',
    category: 'general',
    channel: 'email',
    origin: 'custom',
    updated: '2026-01-01',
  },
  {
    id: 'system',
    title: 'Recommended',
    description: '',
    category: 'general',
    channel: 'email',
    origin: 'system',
    updated: '2026-01-02',
  },
  {
    id: 'custom-new',
    title: 'New Custom',
    description: '',
    category: 'general',
    channel: 'email',
    origin: 'custom',
    updated: '2026-07-01',
  },
];

describe('TemplateGrid', () => {
  it('uses a radio group and selects without applying', () => {
    const onSelect = mock.fn();
    render(<TemplateGrid templates={templates} selectedTemplateId="blank" onSelect={onSelect} />);
    const recommended = screen.getByRole('radio', { name: /Recommended/i });
    fireEvent.click(recommended);
    assert.equal(onSelect.mock.calls[0].arguments[0].id, 'system');
    assert.equal(
      screen.getByRole('radio', { name: /Blank Message/i }).getAttribute('aria-checked'),
      'true'
    );
  });

  it('orders blank, recommended system, then recent custom templates', () => {
    render(<TemplateGrid templates={templates} selectedTemplateId="blank" onSelect={mock.fn()} />);
    const labels = screen.getAllByRole('radio').map((item) => item.textContent || '');
    assert.match(labels[0], /Blank Message/);
    assert.match(labels[1], /Recommended/);
    assert.match(labels[2], /New Custom/);
  });
});
