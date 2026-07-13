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
  it('provides an accessible template search control', () => {
    render(<TemplateGrid templates={templates} selectedTemplateId="blank" onSelect={mock.fn()} />);

    assert.ok(screen.getByLabelText('Search templates'));
  });

  it('offers a call to action when no templates match the search', () => {
    render(<TemplateGrid templates={templates} selectedTemplateId="blank" onSelect={mock.fn()} />);

    fireEvent.change(screen.getByLabelText('Search templates'), {
      target: { value: 'no matching template' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show all templates' }));

    assert.ok(screen.getByRole('radio', { name: /Blank Message/i }));
  });

  it('uses a radio group and selects without applying', () => {
    const onSelect = mock.fn();
    render(<TemplateGrid templates={templates} selectedTemplateId="blank" onSelect={onSelect} />);
    const recommended = screen.getByRole('radio', { name: /Recommended/i });
    fireEvent.click(recommended);
    assert.equal(onSelect.mock.calls[0].arguments[0].id, 'system');
    const blank = screen.getByRole('radio', { name: /Blank Message/i });
    assert.ok(blank instanceof HTMLInputElement);
    assert.equal(blank.checked, true);
  });

  it('uses native radios for standard keyboard navigation', () => {
    render(<TemplateGrid templates={templates} selectedTemplateId="blank" onSelect={mock.fn()} />);

    const radios = screen.getAllByRole('radio');
    assert.ok(radios.length > 1);
    for (const radio of radios) {
      assert.ok(radio instanceof HTMLInputElement);
      assert.equal(radio.type, 'radio');
      assert.equal(radio.name, 'message-template');
    }
  });

  it('orders blank, recommended system, then recent custom templates', () => {
    render(<TemplateGrid templates={templates} selectedTemplateId="blank" onSelect={mock.fn()} />);
    const labels = screen
      .getAllByRole('radio')
      .map((item) => item.parentElement?.textContent || '');
    assert.match(labels[0], /Blank Message/);
    assert.match(labels[1], /Recommended/);
    assert.match(labels[2], /New Custom/);
  });
});
