import React from 'react';
import { SingerPerformanceRsvpRow } from './SingerPerformanceRsvpRow';
import { useSingerRsvpHistory } from '../../hooks/useSingerRsvpHistory';
import './RosterUtils.css';

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
      <div className="text-sm text-muted roster-ut-history-loading">
        Loading RSVP history...
      </div>
    );
  }

  return (
    <div className="flex-col roster-ut-history-container">
      <div>
        <h4 className="roster-ut-history-header">
          Upcoming Performances ({upcomingPerformances.length})
        </h4>
        <div className="flex-col roster-ut-history-list">
          {upcomingPerformances.length === 0 ? (
            <p className="text-sm text-muted roster-ut-margin-0">No upcoming performances.</p>
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
        <h4 className="roster-ut-history-header">
          Past Performances ({pastPerformances.length})
        </h4>
        <div className="flex-col roster-ut-history-list">
          {pastPerformances.length === 0 ? (
            <p className="text-sm text-muted roster-ut-margin-0">No past performances.</p>
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
