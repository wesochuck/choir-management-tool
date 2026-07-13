import type { WizardStep } from './types';

interface WizardStepHeadingProps {
  step: WizardStep;
  number: number;
  title: string;
  description: string;
}

export function WizardStepHeading({ step, number, title, description }: WizardStepHeadingProps) {
  return (
    <div>
      <h2
        tabIndex={-1}
        data-wizard-step-heading={step}
        className="text-text text-base font-semibold outline-none sm:text-lg"
      >
        Step {number}: {title}
      </h2>
      <p className="text-text-muted text-xs sm:text-sm">{description}</p>
    </div>
  );
}
