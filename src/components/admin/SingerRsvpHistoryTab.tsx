import React from 'react';
import { SingerPerformanceRsvpRow } from './SingerPerformanceRsvpRow';
import { useSingerRsvpHistory } from '../../hooks/useSingerRsvpHistory';

interface SingerRsvpHistoryTabProps {
  singerId: string;
  isOpen: boolean;
  isActive: boolean;
}

export const SingerRsvpHistoryTab: React.FC<SingerRsvpHistoryTabProps> = ({ singerId, isOpen, isActive }) => {
  const {
    loadingRsvps,
    savingRsvpId,
    rsvpSaveErrors,
    rosters,
    upcomingPerformances,
    pastPerformances,
    onRsvpChange,
  } = useSingerRsvpHistory({ isOpen, singerId, isActive });

  if (loadingRsvps) {
    return (
      <div className="text-muted p-4 text-sm">
        Loading RSVP history...
      </div>
    );
  }

  return (
    <div className="flex-col gap-4">
      <div>
        <h4 className="m-0 mb-2 text-xs tracking-wider text-text-muted uppercase">
          Upcoming Performances ({upcomingPerformances.length})
        </h4>
        <div className="flex-col gap-2">
          {upcomingPerformances.length === 0 ? (
            <p className="text-muted m-0 text-sm">No upcoming performances.</p>
          ) : (
            upcomingPerformances.map((performance) => {
              const rosterEntry = rosters.find((roster) => roster.event === performance.id);
              return (
                <SingerPerformanceRsvpRow
                  key={performance.id}
                  performance={performance}
                  rosterEntry={rosterEntry}
                  isPast={false}
                  isSaving={savingRsvpId === performance.id}
                  saveError={rsvpSaveErrors[performance.id]}
                  onRsvpChange={onRsvpChange}
                />
              );
            })
          )}
        </div>
      </div>

      <div>
        <h4 className="m-0 mb-2 text-xs tracking-wider text-text-muted uppercase">
          Past Performances ({pastPerformances.length})
        </h4>
        <div className="flex-col gap-2">
          {pastPerformances.length === 0 ? (
            <p className="text-muted m-0 text-sm">No past performances.</p>
          ) : (
            pastPerformances.map((performance) => {
              const rosterEntry = rosters.find((roster) => roster.event === performance.id);
              return (
                <SingerPerformanceRsvpRow
                  key={performance.id}
                  performance={performance}
                  rosterEntry={rosterEntry}
                  isPast={true}
                  isSaving={savingRsvpId === performance.id}
                  saveError={rsvpSaveErrors[performance.id]}
                  onRsvpChange={onRsvpChange}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
