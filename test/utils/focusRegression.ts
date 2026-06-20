import userEvent from '@testing-library/user-event';
import assert from 'node:assert/strict';

export async function expectFocusSurvivesTyping(element: HTMLElement, text = 'abc'): Promise<void> {
  const user = userEvent.setup();

  await user.click(element);
  const focusedBefore = document.activeElement;

  await user.keyboard(text);

  assert.equal(
    document.activeElement,
    focusedBefore,
    'Focused element should remain focused after controlled typing'
  );
}
