// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { useWizardStepNavigation } from '../../../../src/views/admin/communications/useWizardStepNavigation';
import type { WizardStep } from '../../../../src/views/admin/communications/types';

afterEach(() => cleanup());

function Fixture() {
  const [step, setStep] = useState<WizardStep>('TARGETS');
  const ref = useRef<HTMLDivElement>(null);
  useWizardStepNavigation(step, ref);
  return (
    <div ref={ref}>
      <button onClick={() => setStep('REVIEW')}>Next</button>
      <h2 tabIndex={-1} data-wizard-step-heading={step}>
        Heading {step}
      </h2>
    </div>
  );
}

describe('useWizardStepNavigation', () => {
  it('scrolls and focuses only after a real step change', () => {
    const scrollIntoView = mock.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    render(<Fixture />);

    assert.equal(scrollIntoView.mock.callCount(), 0);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    assert.equal(scrollIntoView.mock.callCount(), 1);
    assert.equal(document.activeElement, screen.getByRole('heading', { name: 'Heading REVIEW' }));
  });
});
