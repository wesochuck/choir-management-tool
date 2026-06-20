import React from 'react';

interface Step {
  number: number;
  id: string;
  label: string;
  isValid: boolean;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (stepNumber: number) => void;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  return (
    <div
      className="flex w-full items-center gap-0 py-1 pb-2"
      aria-label="Message creation progress"
    >
      {steps.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isActive = step.number === currentStep;
        const isDisabled = !isCompleted && !isActive && !step.isValid;

        return (
          <div key={step.id} className="flex flex-1 items-center last:flex-initial">
            <button
              type="button"
              disabled={isDisabled}
              className={`inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent px-2 py-1.5 whitespace-nowrap ${
                isActive ? 'text-primary-deep font-semibold' : 'text-text-muted'
              }`}
              onClick={() => onStepClick(step.number)}
            >
              <span
                className={`inline-flex size-7 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'border-primary bg-primary text-white'
                    : isCompleted
                      ? 'border-border bg-primary-light text-text-muted'
                      : 'border-border text-text-muted bg-transparent'
                }`}
              >
                {isCompleted ? '✓' : step.number}
              </span>
              <span
                className={`text-sm transition-all duration-150 ${
                  isActive ? 'text-primary-deep font-semibold' : 'text-text-muted'
                }`}
              >
                {step.label}
              </span>
            </button>

            {index < steps.length - 1 && (
              <span className="bg-border mx-2 h-px flex-1" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
};
