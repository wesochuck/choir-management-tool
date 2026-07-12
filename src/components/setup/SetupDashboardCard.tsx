import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReadinessResult } from '../../lib/readiness';
import { Button } from '../ui';

interface SetupDashboardCardProps {
  items: ReadinessResult[];
}

export const SetupDashboardCard: React.FC<SetupDashboardCardProps> = ({ items }) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const requiredItems = items.filter((i) => i.applicable && i.requiredForLaunch);
  const completedRequiredCount = requiredItems.filter((i) => i.completed).length;
  const totalRequiredCount = requiredItems.length;
  const isFullySetup = completedRequiredCount === totalRequiredCount;

  if (isFullySetup) {
    return null;
  }

  if (collapsed) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 font-sans">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-hidden="true">
            ⚠️
          </span>
          <span className="text-xs font-medium text-amber-200/80">
            Setup checklist is incomplete ({completedRequiredCount}/{totalRequiredCount} required
            items configured).
          </span>
        </div>
        <button
          onClick={() => setCollapsed(false)}
          className="text-xs font-semibold text-amber-400 hover:text-amber-300"
        >
          Expand
        </button>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-amber-500/20 bg-amber-950/20 p-6 font-sans shadow-2xl backdrop-blur-xl">
      <button
        onClick={() => setCollapsed(true)}
        className="absolute top-4 right-4 text-sm text-slate-500 transition-colors hover:text-slate-300"
        aria-label="Collapse"
      >
        ✕
      </button>

      <div className="flex items-start gap-4">
        <div
          className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-2xl text-amber-400"
          role="img"
          aria-hidden="true"
        >
          ⚠️
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-base font-bold text-amber-200">Choir Launch Setup Incomplete</h3>
          <p className="max-w-xl text-xs leading-relaxed text-slate-400">
            You have configured {completedRequiredCount} of {totalRequiredCount} required launcher
            settings. Some features may not function until all required items are finalized.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Button
              variant="primary"
              size="small"
              onClick={() => navigate('/admin/settings/setup-checklist')}
              className="border-none bg-amber-500 font-bold text-slate-950 hover:bg-amber-600"
            >
              <span>Configure Setup Checklist</span>
            </Button>
            <span className="text-[11px] font-semibold text-slate-500">
              Required for launching public-facing operations.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
