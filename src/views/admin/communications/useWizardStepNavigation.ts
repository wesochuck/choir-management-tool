import { useEffect, useRef } from 'react';
import type React from 'react';
import type { WizardStep } from './types';

export function useWizardStepNavigation(
  step: WizardStep,
  containerRef: React.RefObject<HTMLDivElement | null>
): void {
  const previousStepRef = useRef(step);

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;

    const container = containerRef.current;
    const heading = container?.querySelector<HTMLElement>(`[data-wizard-step-heading="${step}"]`);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    container?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    heading?.focus({ preventScroll: true });
  }, [step, containerRef]);
}
