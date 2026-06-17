import React, { useMemo } from 'react';
import type { Profile } from '../../services/profileService';
import type { SectionDef } from '../../services/settingsService';
import { getSectionFromVoicePart, getSectionsFromVoiceParts } from '../../lib/voicePartUtils';
import { AppCard } from '../common/AppCard';
import { useVoiceParts } from '../../hooks/useVoiceParts';

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

  const { partCounts, sectionCounts, sectionsList } = useMemo(() => {
    const pc: Record<string, number> = {};
    const sc: Record<string, number> = {};

    const sectionsListToUse =
      sections.length > 0 ? sections : getSectionsFromVoiceParts(voiceParts);

    voiceParts.forEach((part) => (pc[part.label] = 0));
    sectionsListToUse.forEach((sec: SectionDef) => (sc[sec.code] = 0));

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
    <AppCard
      title="Voice Part Balance"
      actions={
        <div className="flex gap-2">
          <span className="bg-primary-light text-primary-deep inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase">
            {singerTotal} Singers
          </span>
          {staffTotal > 0 && (
            <span className="inline-flex items-center rounded border border-gray-500/20 bg-gray-500/10 px-2 py-0.5 text-xs font-semibold tracking-wider text-gray-600 uppercase">
              {staffTotal} Staff
            </span>
          )}
        </div>
      }
    >
      {/* Section Subtotals */}
      <div
        className="border-border grid grid-cols-[repeat(var(--grid-cols),1fr)] gap-4 border-b pb-4 max-[640px]:grid-cols-2 max-[400px]:grid-cols-1"
        // @allow-inline-style - dynamic grid columns based on section list length using CSS variable
        style={
          {
            '--grid-cols': sectionsList.length,
          } as React.CSSProperties
        }
      >
        {sectionsList.map((sec: SectionDef) => {
          const isSelected = selectedVoiceParts.includes(sec.code);
          return (
            <div
              key={sec.code}
              className={`bg-primary-light cursor-pointer flex-col gap-1 rounded-lg border-2 p-3.5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-sm ${isSelected ? 'border-primary shadow-[0_0_0_1px_var(--color-primary)]' : 'border-transparent'}`}
              onClick={() => onVoicePartToggle?.(sec.code)}
            >
              <div className="text-primary-deep text-xs font-bold tracking-wider uppercase">
                {sec.name}
              </div>
              <div className="text-primary-deep text-[2rem] leading-none font-extrabold">
                {sectionCounts[sec.code] || 0}
              </div>
            </div>
          );
        })}
      </div>

      {/* Individual Part Breakdowns */}
      <div className="mt-0 grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2">
        {voiceParts.map((vp) => {
          const isSelected = selectedVoiceParts.includes(vp.label);
          return (
            <div
              key={vp.label}
              className={`hover:border-primary-deep hover:bg-primary-light cursor-pointer flex-col gap-0.5 rounded text-center transition-all duration-200 hover:-translate-y-px ${isSelected ? 'border-primary bg-primary-light border-2 p-[7px]' : 'border-border bg-bg border p-2'}`}
              onClick={() => onVoicePartToggle?.(vp.label)}
            >
              <div className="text-muted text-xs font-bold">{vp.label}</div>
              <div className="text-label font-bold">{partCounts[vp.label] || 0}</div>
            </div>
          );
        })}
      </div>
    </AppCard>
  );
};
