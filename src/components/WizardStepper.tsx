import type React from 'react';

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
  const activeStep = steps.find((s) => s.number === currentStep);

  return (
    <div className="flex w-full flex-col py-1 pb-2">
      <div className="flex w-full items-center gap-0" aria-label="Message creation progress">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          const isDisabled = !isCompleted && !isActive && !step.isValid;

          return (
            <div
              key={step.id}
              className="flex flex-1 items-center justify-center last:flex-initial md:justify-start"
            >
              <button
                type="button"
                disabled={isDisabled}
                aria-label={`Step ${step.number}: ${step.label}${isActive ? ' (current step)' : ''}${isCompleted ? ' (completed)' : ''}`}
                className={`inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent px-1 py-1.5 whitespace-nowrap md:px-2 ${
                  isActive ? 'text-primary-deep font-semibold' : 'text-text-muted'
                }`}
                onClick={() => onStepClick(step.number)}
              >
                <span
                  aria-hidden="true"
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
                  aria-hidden="true"
                  className={`hidden text-sm transition-all duration-150 md:inline ${
                    isActive ? 'text-primary-deep font-semibold' : 'text-text-muted'
                  }`}
                >
                  {step.label}
                </span>
              </button>

              {index < steps.length - 1 && (
                <span className="bg-border mx-1 h-px flex-1 md:mx-2" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
      {activeStep && (
        <div className="text-primary-deep mt-2 text-center text-xs font-bold tracking-wider uppercase md:hidden">
          Step {activeStep.number}: {activeStep.label}
        </div>
      )}
    </div>
  );
};
