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
      <div className="admin-settings-group">
        <p className="text-muted admin-settings-description">
          Configure the custom voice parts for the choir (e.g. S1, Soprano 1) and link them to a Section Bucket.
        </p>

        <div className="admin-settings-field">
          {configVoiceParts.map((vp, index) => {
            const count = getSingerCountForPart(vp.label);
            const isTied = count > 0;
            const section = configSections.find(s => s.code === vp.sectionCode);
            const defaultColor = section?.color || '#e0e0e0';
            return (
              <div key={index} className="grid w-full grid-cols-[90px_1fr_150px_130px_90px_80px] items-center gap-4">
                <input
                  value={vp.label}
                  onChange={(e) => {
                    const newParts = [...configVoiceParts];
                    newParts[index] = { ...newParts[index], label: e.target.value };
                    setConfigVoiceParts(newParts);
                  }}
                  placeholder="Label"
                  disabled={isTied}
                  className="card admin-settings-input-full"
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
                  className="card admin-settings-input-full"
                />
                <select
                  value={vp.sectionCode}
                  onChange={(e) => {
                    const newParts = [...configVoiceParts];
                    newParts[index] = { ...newParts[index], sectionCode: e.target.value };
                    setConfigVoiceParts(newParts);
                  }}
                  className="card admin-settings-input-full"
                >
                  <option value="">Select Section...</option>
                  {configSections.map(s => (
                    <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5">
                  <div className="admin-color-picker-input-wrapper">
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
                      className="admin-color-picker-input"
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
                    className="card admin-color-hex-input"
                  />
                </div>

                {vp.label ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('roster');
                      setFilter('voiceParts', [vp.label]);
                    }}
                    className="btn btn-secondary btn-sm admin-action-btn-sm admin-action-btn-sm-gap"
                    title={`Click to view the ${count} singer(s) in this voice part`}
                  >
                    <span className="font-semibold">{count}</span>
                    <span>singer{count === 1 ? '' : 's'}</span>
                  </button>
                ) : (
                  // @allow-inline-style
                  <div style={{ height: '36px' }} />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setConfigVoiceParts(configVoiceParts.filter((_, idx) => idx !== index));
                  }}
                  disabled={isTied}
                  className="btn btn-danger btn-sm admin-action-btn-sm"
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
          className="btn btn-secondary admin-align-start"
        >
          + Add Voice Part
        </button>
      </div>
    </AppCard>
  );
}
