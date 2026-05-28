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
    <div className="stepper-container">
      {steps.map((step) => {
        const isCompleted = step.number < currentStep;
        const isActive = step.number === currentStep;
        const isDisabled = !isCompleted && !isActive && !step.isValid;

        return (
          <button
            key={step.number}
            type="button"
            disabled={isDisabled}
            onClick={() => onStepClick(step.number)}
            className={`step-btn ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
          >
            <span className="step-number">{step.number}</span>
            <span className="step-label">{step.label}</span>
          </button>
        );
      })}
    </div>
  );
};
