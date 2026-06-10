import React from 'react';

export interface Step {
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
    <div className="flex items-center w-full gap-0 py-1 pb-2" aria-label="Message creation progress">
      {steps.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isActive = step.number === currentStep;
        const isDisabled = !isCompleted && !isActive && !step.isValid;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-initial">
            <button
              type="button"
              disabled={isDisabled}
              className={`inline-flex items-center gap-2 border-0 bg-transparent py-1.5 px-2 cursor-pointer whitespace-nowrap ${
                isActive ? 'text-primary-deep font-semibold' : 'text-text-muted'
              }`}
              onClick={() => onStepClick(step.number)}
            >
              <span className={`w-7 h-7 rounded-full border inline-flex items-center justify-center text-xs font-semibold transition-all duration-150 ${
                isActive ? 'bg-primary border-primary text-white' : 
                isCompleted ? 'bg-primary-light border-border text-text-muted' : 
                'bg-transparent border-border text-text-muted'
              }`}>
                {isCompleted ? '✓' : step.number}
              </span>
              <span className={`text-sm transition-all duration-150 ${
                isActive ? 'text-primary-deep font-semibold' : 'text-text-muted'
              }`}>{step.label}</span>
            </button>

            {index < steps.length - 1 && (
              <span className="h-px flex-1 bg-border mx-2" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
};

