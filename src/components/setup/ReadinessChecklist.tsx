import React from 'react';
import { Link } from 'react-router-dom';
import type { ReadinessResult } from '../../lib/readiness';
import { Button } from '../ui';

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
          className={`flex items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
            item.completed
              ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/10'
              : 'border-border bg-surface hover:border-primary/50'
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
                  item.completed
                    ? 'text-text/80 hover:text-primary-deep'
                    : 'text-primary hover:text-primary-deep'
                }`}
              >
                {item.label}
              </Link>
              <span className="mt-0.5 text-[9px] font-bold tracking-wider uppercase">
                {item.requiredForLaunch ? (
                  <span className="text-danger-text bg-danger-bg/50 rounded px-1.5 py-0.5">
                    Required
                  </span>
                ) : (
                  <span className="text-text-muted bg-surface-muted border-border rounded border px-1.5 py-0.5">
                    Optional
                  </span>
                )}
              </span>
            </div>
          </div>
          <div>
            {item.completed ? (
              <span className="bg-success-bg text-success-text rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                Ready
              </span>
            ) : (
              <Button
                as={Link}
                to={item.destination}
                variant="primary"
                size="small"
                className="no-underline"
              >
                Configure
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
