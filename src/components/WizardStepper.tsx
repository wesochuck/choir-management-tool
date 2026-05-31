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
    <div className="wizard-stepper" aria-label="Message creation progress">
      {steps.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isActive = step.number === currentStep;
        const isIncomplete = step.number > currentStep;
        const isDisabled = !isCompleted && !isActive && !step.isValid;

        return (
          <div key={step.id} className="wizard-stepper-item-wrap">
            <button
              type="button"
              disabled={isDisabled}
              className={[
                'wizard-stepper-item',
                isCompleted ? 'completed' : '',
                isActive ? 'active' : '',
                isIncomplete ? 'incomplete' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onStepClick(step.number)}
            >
              <span className="wizard-stepper-circle">
                {isCompleted ? '✓' : step.number}
              </span>
              <span className="wizard-stepper-label">{step.label}</span>
            </button>

            {index < steps.length - 1 && (
              <span className="wizard-stepper-line" aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
};

