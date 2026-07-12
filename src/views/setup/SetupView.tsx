import React from 'react';
import { useSetup } from '../../contexts/SetupContext';

const SetupView: React.FC = () => {
  const { status } = useSetup();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6 text-white">
      <h1 id="setup-view-title" className="mb-4 text-3xl font-bold">
        First-Run Setup
      </h1>
      <p className="text-lg text-slate-300">
        Setup State: <span className="font-semibold text-teal-400">{status?.state}</span>
      </p>
    </div>
  );
};

export default SetupView;
