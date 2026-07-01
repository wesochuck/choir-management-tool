import React, { useMemo } from 'react';
import type { Profile } from '../../services/profileService';
import { getSectionFromVoicePart, getSectionsFromVoiceParts } from '../../lib/voicePartUtils';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { pluralizeLabel } from '../../lib/labelHelpers';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { VoicePartBalanceCard } from './VoicePartBalanceCard';

interface RosterSummaryProps {
  profiles: Profile[];
  selectedVoiceParts?: string[];
  onVoicePartToggle?: (part: string) => void;
}

export const RosterSummary: React.FC<RosterSummaryProps> = ({
  profiles,
  selectedVoiceParts = [],
  onVoicePartToggle,
}) => {
  const { voiceParts, sections } = useVoiceParts();
  const { performerLabel } = useChoirSettings();
  const performerLabelPlural = pluralizeLabel(performerLabel);

  const { partCounts, sectionCounts, sectionsList } = useMemo(() => {
    const pc: Record<string, number> = {};
    const sc: Record<string, number> = {};

    const sectionsListToUse =
      sections.length > 0 ? sections : getSectionsFromVoiceParts(voiceParts);

    voiceParts.forEach((part) => (pc[part.label] = 0));
    sectionsListToUse.forEach((sec) => (sc[sec.code] = 0));

    profiles.forEach((p) => {
      if (p.voicePart) {
        if (pc[p.voicePart] !== undefined) {
          pc[p.voicePart]++;
        } else {
          pc[p.voicePart] = 1;
        }

        const vpDef = voiceParts.find((vp) => vp.label === p.voicePart);
        const section = vpDef ? vpDef.sectionCode : getSectionFromVoicePart(p.voicePart);

        if (sc[section] !== undefined) {
          sc[section]++;
        } else {
          sc[section] = (sc[section] || 0) + 1;
        }
      }
    });

    return { partCounts: pc, sectionCounts: sc, sectionsList: sectionsListToUse };
  }, [profiles, voiceParts, sections]);

  const singerTotal = profiles.filter((p) => !!p.voicePart).length;
  const staffTotal = profiles.length - singerTotal;

  return (
    <VoicePartBalanceCard
      title="Voice Part Balance"
      badges={
        <div className="flex gap-2">
          <span className="bg-primary-light text-primary-deep inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase">
            {singerTotal} {performerLabelPlural}
          </span>
          {staffTotal > 0 && (
            <span className="inline-flex items-center rounded border border-gray-500/20 bg-gray-500/10 px-2 py-0.5 text-xs font-semibold tracking-wider text-gray-600 uppercase">
              {staffTotal} Staff
            </span>
          )}
        </div>
      }
      sections={sectionsList.map((sec) => ({
        code: sec.code,
        name: sec.name,
        count: sectionCounts[sec.code] || 0,
        selected: selectedVoiceParts.includes(sec.code),
        onClick: () => onVoicePartToggle?.(sec.code),
      }))}
      voiceParts={voiceParts.map((vp) => ({
        label: vp.label,
        count: partCounts[vp.label] || 0,
        selected: selectedVoiceParts.includes(vp.label),
        onClick: () => onVoicePartToggle?.(vp.label),
      }))}
    />
  );
};
