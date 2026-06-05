import React, { useMemo, useState, useEffect } from 'react';
import type { Profile } from '../../services/profileService';
import { getVoicePartsAndSections, type VoicePartDef, type SectionDef } from '../../services/settingsService';
import { getSectionFromVoicePart, getSectionsFromVoiceParts } from '../../lib/voicePartUtils';
import { AppCard } from '../common/AppCard';

interface RosterSummaryProps {
  profiles: Profile[];
  selectedVoiceParts?: string[];
  onVoicePartToggle?: (part: string) => void;
}

export const RosterSummary: React.FC<RosterSummaryProps> = ({ 
  profiles, 
  selectedVoiceParts = [], 
  onVoicePartToggle 
}) => {
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [sections, setSections] = useState<SectionDef[]>([]);

  useEffect(() => {
    getVoicePartsAndSections().then((settings) => {
      setVoiceParts(settings.voiceParts);
      setSections(settings.sections);
    }).catch(() => undefined);
  }, []);

  const { partCounts, sectionCounts, sectionsList } = useMemo(() => {
    const pc: Record<string, number> = {};
    const sc: Record<string, number> = {};
    
    const sectionsListToUse = sections.length > 0 ? sections : getSectionsFromVoiceParts(voiceParts);
    
    voiceParts.forEach(part => pc[part.label] = 0);
    sectionsListToUse.forEach((sec: SectionDef) => sc[sec.code] = 0);

    profiles.forEach(p => {
      if (p.voicePart) {
        if (pc[p.voicePart] !== undefined) {
          pc[p.voicePart]++;
        } else {
          pc[p.voicePart] = 1;
        }

        const vpDef = voiceParts.find(vp => vp.label === p.voicePart);
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

  const singerTotal = profiles.filter(p => !!p.voicePart).length;
  const staffTotal = profiles.length - singerTotal;

  return (
    <AppCard 
      title="Voice Part Balance"
      actions={
        <div className="admin-flex-row-gap-sm">
          <span className="badge badge-rehearsal admin-roster-summary-badge-singer">
            {singerTotal} Singers
          </span>
          {staffTotal > 0 && (
            <span className="badge badge-muted admin-roster-summary-badge-staff">
              {staffTotal} Staff
            </span>
          )}
        </div>
      }
      className="admin-settings-group"
    >
      <style>{`
        .voice-section-card {
          transition: all 0.2s ease-in-out;
          cursor: pointer;
          border: 2px solid transparent;
        }
        .voice-section-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
          opacity: 0.9;
        }
        .voice-section-card.selected {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 1px var(--primary);
        }
        .voice-part-card {
          transition: all 0.2s ease-in-out;
          cursor: pointer;
          border: 1px solid var(--border);
        }
        .voice-part-card:hover {
          border-color: var(--primary-deep);
          background-color: var(--primary-light) !important;
          transform: translateY(-1px);
        }
        .voice-part-card.selected {
          border-color: var(--primary) !important;
          background-color: var(--primary-light) !important;
        }
        @media (max-width: 640px) {
          .roster-summary-sections {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 400px) {
          .roster-summary-sections {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Section Subtotals */}
      <div 
        className="roster-summary-sections"
        // @allow-inline-style - dynamic grid columns based on section list length
        style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${sectionsList.length}, 1fr)`, 
          gap: 'var(--space-md)',
          paddingBottom: 'var(--space-md)',
          borderBottom: '1px solid var(--border)'
        }}
      >
        {sectionsList.map((sec: SectionDef) => {
          const isSelected = selectedVoiceParts.includes(sec.code);
          return (
            <div 
              key={sec.code} 
              className={`flex-col voice-section-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onVoicePartToggle?.(sec.code)}
              // @allow-inline-style - dynamic border color
              style={{ 
                textAlign: 'center', 
                padding: 'calc(var(--space-md) - 2px)', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: 'var(--primary-light)',
                gap: 'var(--space-xs)',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: isSelected ? 'var(--primary)' : 'transparent'
              }}
            >
              // @allow-inline-style - typography overrides
              <div className="text-xs" style={{ color: 'var(--primary-deep)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {sec.name}
              </div>
              // @allow-inline-style - typography overrides
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-deep)', lineHeight: 1 }}>{sectionCounts[sec.code] || 0}</div>
            </div>
          );
        })}
      </div>

      {/* Individual Part Breakdowns */}
      {/* @allow-inline-style - dynamic grid layout configuration */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
        gap: 'var(--space-sm)',
        marginTop: 0
      }}>
        {voiceParts.map(vp => {
          const isSelected = selectedVoiceParts.includes(vp.label);
          return (
            <div 
              key={vp.label} 
              className={`flex-col voice-part-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onVoicePartToggle?.(vp.label)}
              // @allow-inline-style - dynamic padding and borders based on selection state
              style={{ 
                textAlign: 'center', 
                borderRadius: 'var(--radius-sm)', 
                backgroundColor: 'var(--bg)',
                gap: '2px',
                borderStyle: 'solid',
                borderWidth: isSelected ? '2px' : '1px',
                padding: isSelected ? 'calc(var(--space-sm) - 1px)' : 'var(--space-sm)'
              }}
            >
              // @allow-inline-style - typography overrides
              <div className="text-xs text-muted" style={{ fontWeight: 700 }}>{vp.label}</div>
              // @allow-inline-style - typography overrides
              <div className="text-label" style={{ fontWeight: 700 }}>{partCounts[vp.label] || 0}</div>
            </div>
          );
        })}
      </div>
    </AppCard>
  );
};
