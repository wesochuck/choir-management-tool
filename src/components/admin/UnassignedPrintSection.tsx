import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { pluralizeLabel } from '../../lib/labelHelpers';
import type { Profile } from '../../services/profileService';

interface UnassignedPrintSectionProps {
  activeProfiles: Profile[];
  assignments: Record<string, string>;
}

export function UnassignedPrintSection({
  activeProfiles,
  assignments,
}: UnassignedPrintSectionProps) {
  const { performerLabel } = useChoirSettings();
  const performerLabelPlural = pluralizeLabel(performerLabel);
  const assignedIds = new Set(Object.values(assignments));
  const unassigned = activeProfiles.filter((p) => !assignedIds.has(p.id));

  if (unassigned.length === 0) return null;

  return (
    <div className="hidden print:block" data-unassigned-print>
      <div className="mt-6 inline-flex w-full items-center rounded bg-gray-200 px-2 py-0.5 text-xs font-semibold tracking-wider text-gray-700 uppercase">
        ⚠️ Unassigned {performerLabelPlural}: {unassigned.length}
      </div>
    </div>
  );
}
