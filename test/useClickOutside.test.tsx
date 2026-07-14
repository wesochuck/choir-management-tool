// @vitest-environment jsdom
import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useRef } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { useClickOutside } from '../src/hooks/useClickOutside';

function TestComponent({
  onClickOutside,
  options,
}: {
  onClickOutside: () => void;
  options?: { enabled?: boolean; escape?: boolean };
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClickOutside, options);

  return (
    <div>
      <div data-testid="outside">Outside Element</div>
      <div ref={ref} data-testid="inside">
        Inside Element
        <button data-testid="inside-button">Inside Button</button>
      </div>
    </div>
  );
}

describe('useClickOutside hook', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('triggers callback when clicking outside', () => {
    const onClickOutside = mock.fn();
    const { getByTestId } = render(
      <TestComponent onClickOutside={onClickOutside} />
    );

    fireEvent.mouseDown(getByTestId('outside'));

    assert.equal(onClickOutside.mock.callCount(), 1);
  });

  it('does not trigger callback when clicking inside', () => {
    const onClickOutside = mock.fn();
    const { getByTestId } = render(
      <TestComponent onClickOutside={onClickOutside} />
    );

    fireEvent.mouseDown(getByTestId('inside'));
    fireEvent.mouseDown(getByTestId('inside-button'));

    assert.equal(onClickOutside.mock.callCount(), 0);
  });

  it('triggers callback on Escape key when escape is true', () => {
    const onClickOutside = mock.fn();
    render(
      <TestComponent onClickOutside={onClickOutside} options={{ escape: true }} />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    assert.equal(onClickOutside.mock.callCount(), 1);
  });

  it('does not trigger callback on Escape key when escape is false', () => {
    const onClickOutside = mock.fn();
    render(
      <TestComponent onClickOutside={onClickOutside} options={{ escape: false }} />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    assert.equal(onClickOutside.mock.callCount(), 0);
  });

  it('does not trigger callback on other keys', () => {
    const onClickOutside = mock.fn();
    render(
      <TestComponent onClickOutside={onClickOutside} options={{ escape: true }} />
    );

    fireEvent.keyDown(document, { key: 'Enter' });

    assert.equal(onClickOutside.mock.callCount(), 0);
  });

  it('does not trigger callback when enabled is false', () => {
    const onClickOutside = mock.fn();
    const { getByTestId } = render(
      <TestComponent onClickOutside={onClickOutside} options={{ enabled: false, escape: true }} />
    );

    fireEvent.mouseDown(getByTestId('outside'));
    fireEvent.keyDown(document, { key: 'Escape' });

    assert.equal(onClickOutside.mock.callCount(), 0);
  });
});
