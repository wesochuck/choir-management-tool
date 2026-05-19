import type { Profile } from '../../services/profileService';

interface UnassignedPrintSectionProps {
  activeProfiles: Profile[];
  assignments: Record<string, string>;
}

export function UnassignedPrintSection({ 
  activeProfiles, 
  assignments 
}: UnassignedPrintSectionProps) {
  const assignedIds = new Set(Object.values(assignments));
  const unassigned = activeProfiles.filter(p => !assignedIds.has(p.id));

  if (unassigned.length === 0) return null;

  return (
    <div className="print-only unassigned-print-section">
      <div className="unassigned-print-badge">
        ⚠️ Unassigned Singers: {unassigned.length}
      </div>
    </div>
  );
}
