// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PocketHostStep } from '../../../src/views/setup/steps/PocketHostStep';

afterEach(() => {
  document.body.innerHTML = '';
  mock.restoreAll();
});

describe('PocketHostStep', () => {
  it('generates random secrets and invokes onSuccess when clicked', () => {
    // Mock navigator.clipboard
    const writeTextSpy = mock.fn(async (text: string) => {});
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true,
      writable: true,
    });

    const onSuccessSpy = mock.fn(
      (secrets: { hmacSecret: string; maintenanceSecret: string }) => {}
    );

    render(<PocketHostStep onSuccess={onSuccessSpy} />);

    // Verify header renders
    assert.ok(screen.getByText('Configure PocketHost Secrets'));

    // Check inputs contain base64url keys (approx length 43)
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    assert.strictEqual(inputs.length, 2);
    assert.strictEqual(inputs[0].value.length, 43);
    assert.strictEqual(inputs[1].value.length, 43);

    // Click first copy button
    const copyButtons = screen.getAllByText('Copy');
    fireEvent.click(copyButtons[0]);
    assert.strictEqual(writeTextSpy.mock.callCount(), 1);
    assert.strictEqual(writeTextSpy.mock.calls[0].arguments[0], inputs[0].value);

    // Click continue button
    const continueBtn = screen.getByText('I have set these, continue');
    fireEvent.click(continueBtn);

    assert.strictEqual(onSuccessSpy.mock.callCount(), 1);
    assert.deepStrictEqual(onSuccessSpy.mock.calls[0].arguments[0], {
      hmacSecret: inputs[0].value,
      maintenanceSecret: inputs[1].value,
    });
  });
});
