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
      <div className="text-sm text-muted" style={{ padding: 'var(--space-md)' }}>
        Loading RSVP history...
      </div>
    );
  }

  return (
    <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
      <div>
        <h4 style={{ margin: '0 0 8px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          Upcoming Performances ({upcomingPerformances.length})
        </h4>
        <div className="flex-col" style={{ gap: '8px' }}>
          {upcomingPerformances.length === 0 ? (
            <p className="text-sm text-muted" style={{ margin: 0 }}>No upcoming performances.</p>
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
        <h4 style={{ margin: '0 0 8px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          Past Performances ({pastPerformances.length})
        </h4>
        <div className="flex-col" style={{ gap: '8px' }}>
          {pastPerformances.length === 0 ? (
            <p className="text-sm text-muted" style={{ margin: 0 }}>No past performances.</p>
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
