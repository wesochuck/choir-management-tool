import React from 'react';
import { Link } from 'react-router-dom';
import type { ReadinessResult } from '../../lib/readiness';

interface ReadinessChecklistProps {
  items: ReadinessResult[];
}

export const ReadinessChecklist: React.FC<ReadinessChecklistProps> = ({ items }) => {
  const applicableItems = items.filter((item) => item.applicable);

  return (
    <div className="space-y-3 font-sans">
      {applicableItems.map((item) => (
        <div
          key={item.id}
          className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
            item.completed
              ? 'border-teal-500/20 bg-teal-500/5'
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl" role="img" aria-hidden="true">
              {item.completed ? '✅' : '❌'}
            </span>
            <div className="flex flex-col">
              <Link
                to={item.destination}
                className={`text-sm font-semibold hover:underline ${
                  item.completed ? 'text-slate-300' : 'text-teal-400 hover:text-teal-300'
                }`}
              >
                {item.label}
              </Link>
              <span className="mt-0.5 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                {item.requiredForLaunch ? (
                  <span className="text-rose-400">Required</span>
                ) : (
                  <span className="text-slate-400">Optional</span>
                )}
              </span>
            </div>
          </div>
          <div>
            {item.completed ? (
              <span className="text-xs font-medium text-teal-400">Ready</span>
            ) : (
              <Link
                to={item.destination}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
              >
                Configure
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
