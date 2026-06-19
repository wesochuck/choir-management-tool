import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, cleanup, screen } from '@testing-library/react';
import { Dropdown, DropdownMenu, DropdownMenuItem } from './Dropdown';

afterEach(() => {
  cleanup();
});

test('Dropdown renders trigger in test environment and shows items on click', () => {
  render(
    <Dropdown trigger={<button data-testid="trigger-btn">Actions</button>}>
      <DropdownMenu>
        <DropdownMenuItem onClick={() => {}} data-testid="item-1">
          Item 1
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {}} data-testid="item-2">
          Item 2
        </DropdownMenuItem>
      </DropdownMenu>
    </Dropdown>
  );

  // Trigger should be rendered
  const trigger = screen.getByTestId('trigger-btn');
  assert.ok(trigger, 'renders trigger button');

  // Items should not be visible before clicking trigger
  assert.equal(screen.queryByTestId('item-1'), null);

  // Click trigger
  fireEvent.click(trigger);

  // Items should now be rendered
  const item1 = screen.getByTestId('item-1');
  const item2 = screen.getByTestId('item-2');
  assert.ok(item1, 'renders first menu item on click');
  assert.ok(item2, 'renders second menu item on click');
  assert.equal(item1.textContent?.trim(), 'Item 1');

  // Click trigger again to toggle close
  fireEvent.click(trigger);
  assert.equal(screen.queryByTestId('item-1'), null, 'dropdown is closed on click');
});

test('DropdownMenuItem calls onClick when clicked in test mode', () => {
  let clicked = false;
  render(
    <Dropdown trigger={<button data-testid="trigger-btn">Actions</button>}>
      <DropdownMenu>
        <DropdownMenuItem
          onClick={() => {
            clicked = true;
          }}
          data-testid="item-1"
        >
          Item 1
        </DropdownMenuItem>
      </DropdownMenu>
    </Dropdown>
  );

  // Open the dropdown
  fireEvent.click(screen.getByTestId('trigger-btn'));

  // Click the item
  fireEvent.click(screen.getByTestId('item-1'));
  assert.equal(clicked, true, 'onClick is called on click');
});
