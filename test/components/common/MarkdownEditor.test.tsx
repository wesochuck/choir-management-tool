// @vitest-environment jsdom
import { afterEach, it } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MarkdownEditor } from '../../../src/components/common/MarkdownEditor';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

function ControlledMarkdownEditor() {
  const [value, setValue] = useState('Hello');

  return (
    <MarkdownEditor value={value} onChange={setValue} minHeight="120px" placeholder="Type here" />
  );
}

it('renders a textarea in test mode', () => {
  render(<ControlledMarkdownEditor />);
  const textarea = screen.getByRole('textbox');
  assert.ok(textarea);
  assert.equal((textarea as HTMLTextAreaElement).value, 'Hello');
});

it('keeps focus while typing into a controlled editor', async () => {
  const user = userEvent.setup();
  render(<ControlledMarkdownEditor />);

  const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

  await user.click(textarea);
  await user.keyboard(' world');

  assert.equal(document.activeElement, textarea, 'Focus should remain after typing');
  assert.equal(textarea.value, 'Hello world');
});

it('updates parent state when typing', async () => {
  const user = userEvent.setup();
  render(<ControlledMarkdownEditor />);

  const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

  await user.click(textarea);
  await user.keyboard(' world');

  assert.equal(textarea.value, 'Hello world');
});

it('loads new external value without remounting', () => {
  function StaticEditor({ val }: { val: string }) {
    return <MarkdownEditor value={val} onChange={() => {}} minHeight="120px" />;
  }

  const { container, rerender } = render(<StaticEditor val="First" />);
  const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
  assert.equal(textarea.value, 'First');

  rerender(<StaticEditor val="Second" />);
  assert.equal(textarea.value, 'Second', 'External value change should update textarea');
});
