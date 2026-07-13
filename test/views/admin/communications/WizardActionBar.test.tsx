// @vitest-environment jsdom
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, render, screen } from '@testing-library/react';

import { WizardActionBar } from '../../../../src/views/admin/communications/WizardActionBar';

afterEach(() => cleanup());

describe('WizardActionBar', () => {
  it('renders a compact safe-area-aware mobile row', () => {
    render(
      <WizardActionBar>
        <button type="button">Action</button>
      </WizardActionBar>
    );

    const actionBar = screen.getByRole('button', { name: 'Action' }).parentElement;
    assert.ok(actionBar);
    assert.match(actionBar.className, /min-h-16/);
    assert.match(actionBar.className, /justify-between/);
    assert.match(actionBar.className, /env\(safe-area-inset-bottom\)/);
    assert.doesNotMatch(actionBar.className, /flex-col/);
  });
});
