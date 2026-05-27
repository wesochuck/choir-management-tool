import { AppCard } from '../common/AppCard';
import type { SectionDef, VoicePartDef } from '../../services/settingsService';
import type { Profile } from '../../services/profileService';
import { getContrastColor } from '../../lib/colorUtils';

interface VoicePartEditorProps {
  configVoiceParts: VoicePartDef[];
  setConfigVoiceParts: (voiceParts: VoicePartDef[]) => void;
  configSections: SectionDef[];
  allProfiles: Profile[];
  setActiveTab: (tab: 'roster' | 'config') => void;
  setFilter: {
    (key: 'status', value: string): void;
    (key: 'name', value: string): void;
    (key: 'voiceParts', value: string[]): void;
  };
}

export function VoicePartEditor({
  configVoiceParts,
  setConfigVoiceParts,
  configSections,
  allProfiles,
  setActiveTab,
  setFilter,
}: VoicePartEditorProps) {
  const getSingerCountForPart = (label: string) => {
    if (!label) return 0;
    return allProfiles.filter(p => p.voicePart === label).length;
  };

  return (
    <AppCard title="Voice Part Configurations">
      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        <p className="text-muted" style={{ margin: 0 }}>
          Configure the custom voice parts for the choir (e.g. S1, Soprano 1) and link them to a Section Bucket.
        </p>

        <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
          {configVoiceParts.map((vp, index) => {
            const count = getSingerCountForPart(vp.label);
            const isTied = count > 0;
            const section = configSections.find(s => s.code === vp.sectionCode);
            const defaultColor = section?.color || '#e0e0e0';
            return (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 150px 130px 90px 80px', gap: 'var(--space-md)', alignItems: 'center', width: '100%' }}>
                <input
                  value={vp.label}
                  onChange={(e) => {
                    const newParts = [...configVoiceParts];
                    newParts[index] = { ...newParts[index], label: e.target.value };
                    setConfigVoiceParts(newParts);
                  }}
                  placeholder="Label"
                  disabled={isTied}
                  className="card"
                  style={{ width: '100%', padding: '0 8px', height: '40px', minHeight: '40px' }}
                  title={isTied ? "Cannot change the label of a voice part with assigned singers" : undefined}
                />
                <input
                  value={vp.fullName}
                  onChange={(e) => {
                    const newParts = [...configVoiceParts];
                    newParts[index] = { ...newParts[index], fullName: e.target.value };
                    setConfigVoiceParts(newParts);
                  }}
                  placeholder="Full Name"
                  className="card"
                  style={{ width: '100%', padding: '0 12px', height: '40px', minHeight: '40px' }}
                />
                <select
                  value={vp.sectionCode}
                  onChange={(e) => {
                    const newParts = [...configVoiceParts];
                    newParts[index] = { ...newParts[index], sectionCode: e.target.value };
                    setConfigVoiceParts(newParts);
                  }}
                  className="card"
                  style={{ width: '100%', padding: '0 12px', height: '40px', minHeight: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                >
                  <option value="">Select Section...</option>
                  {configSections.map(s => (
                    <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                  ))}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                    <input
                      type="color"
                      value={vp.color || defaultColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newParts = [...configVoiceParts];
                        newParts[index] = {
                          ...newParts[index],
                          color: val,
                          colorBg: val,
                          colorText: getContrastColor(val)
                        };
                        setConfigVoiceParts(newParts);
                      }}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        left: '-8px',
                        width: '48px',
                        height: '48px',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    value={vp.color || ''}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val && !val.startsWith('#')) val = '#' + val;
                      val = val.replace(/[^0-9A-Fa-f#]/g, '').substring(0, 7);
                      const newParts = [...configVoiceParts];
                      newParts[index] = {
                        ...newParts[index],
                        color: val || undefined,
                        colorBg: val || undefined,
                        colorText: val ? getContrastColor(val) : undefined
                      };
                      setConfigVoiceParts(newParts);
                    }}
                    placeholder="Inherit"
                    className="card"
                    style={{
                      width: '80px',
                      padding: '0 8px',
                      height: '32px',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '11px',
                      margin: 0
                    }}
                  />
                </div>

                {vp.label ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('roster');
                      setFilter('voiceParts', [vp.label]);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '36px', minHeight: '36px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    title={`Click to view the ${count} singer(s) in this voice part`}
                  >
                    <span style={{ fontWeight: 600 }}>{count}</span>
                    <span>singer{count === 1 ? '' : 's'}</span>
                  </button>
                ) : (
                  <div style={{ height: '36px' }} />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setConfigVoiceParts(configVoiceParts.filter((_, idx) => idx !== index));
                  }}
                  disabled={isTied}
                  className="btn btn-danger btn-sm"
                  style={{ height: '36px', minHeight: '36px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title={isTied ? "Cannot delete voice part with assigned singers" : undefined}
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setConfigVoiceParts([...configVoiceParts, { label: '', fullName: '', sectionCode: '' }])}
          className="btn btn-secondary"
          style={{ alignSelf: 'flex-start' }}
        >
          + Add Voice Part
        </button>
      </div>
    </AppCard>
  );
}
