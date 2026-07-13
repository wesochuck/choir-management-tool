import { useState } from 'react';
import { useSetup } from '../../../contexts/SetupContext';
import { SETUP_SECTIONS } from '../setupSections';

interface FeatureConfigurationStepProps {
  onSuccess: () => void;
}

export function FeatureConfigurationStep({ onSuccess }: FeatureConfigurationStepProps) {
  const { loading, enabledModules } = useSetup();

  // Filter sections that belong to currently enabled modules
  const activeSections = SETUP_SECTIONS.filter((sec) => enabledModules.has(sec.moduleId));

  const [activeSubStep, setActiveSubStep] = useState(0);

  if (loading) {
    return <div>Loading configurations...</div>;
  }

  // If no sections are active, we are done
  if (activeSections.length === 0) {
    onSuccess();
    return null;
  }

  const currentSection = activeSections[activeSubStep];
  const Component = currentSection.component;

  const handleNext = () => {
    if (activeSubStep < activeSections.length - 1) {
      setActiveSubStep(activeSubStep + 1);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-step indicator */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Module Configuration
        </span>
        <span className="text-xs font-semibold text-teal-400">
          Step {activeSubStep + 1} of {activeSections.length}
        </span>
      </div>

      {/* Render active sub-step component */}
      <div className="min-h-[300px]">
        <Component onSuccess={handleNext} onSetLater={handleNext} />
      </div>
    </div>
  );
}
