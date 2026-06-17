import { AppCard } from '../common/AppCard';
import type { SectionDef, VoicePartDef } from '../../services/settingsService';
import type { Profile } from '../../services/profileService';
import { getContrastColor } from '../../lib/colorUtils';
import { Button, Select, Input, ColorPicker } from '../ui';

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
    return allProfiles.filter((p) => p.voicePart === label).length;
  };

  return (
    <AppCard title="Voice Part Configurations">
      <div className="flex flex-col gap-4">
        <p className="mb-2 text-xs text-slate-500">
          Configure the custom voice parts for the choir (e.g. S1, Soprano 1) and link them to a
          Section Bucket.
        </p>

        <div className="flex flex-col gap-3">
          {configVoiceParts.map((vp, index) => {
            const count = getSingerCountForPart(vp.label);
            const isTied = count > 0;
            const section = configSections.find((s) => s.code === vp.sectionCode);
            const defaultColor = section?.color || '#e0e0e0';
            return (
              <div
                key={index}
                className="grid w-full grid-cols-[90px_1fr_150px_130px_100px_80px] items-center gap-4"
              >
                <Input
                  value={vp.label}
                  onChange={(e) => {
                    const newParts = [...configVoiceParts];
                    newParts[index] = { ...newParts[index], label: e.target.value };
                    setConfigVoiceParts(newParts);
                  }}
                  placeholder="Label"
                  disabled={isTied}
                  title={
                    isTied
                      ? 'Cannot change the label of a voice part with assigned singers'
                      : undefined
                  }
                />
                <Input
                  value={vp.fullName}
                  onChange={(e) => {
                    const newParts = [...configVoiceParts];
                    newParts[index] = { ...newParts[index], fullName: e.target.value };
                    setConfigVoiceParts(newParts);
                  }}
                  placeholder="Full Name"
                />
                <Select
                  value={vp.sectionCode}
                  onChange={(e) => {
                    const newParts = [...configVoiceParts];
                    newParts[index] = { ...newParts[index], sectionCode: e.target.value };
                    setConfigVoiceParts(newParts);
                  }}
                  size="small"
                >
                  <option value="">Select Section...</option>
                  {configSections.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </Select>

                <div className="flex items-center gap-1.5">
                  <ColorPicker
                    value={vp.color || defaultColor}
                    onChange={(val) => {
                      const newParts = [...configVoiceParts];
                      newParts[index] = {
                        ...newParts[index],
                        color: val,
                        colorBg: val,
                        colorText: getContrastColor(val),
                      };
                      setConfigVoiceParts(newParts);
                    }}
                    size="small"
                    label=""
                  />
                  <Input
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
                        colorText: val ? getContrastColor(val) : undefined,
                      };
                      setConfigVoiceParts(newParts);
                    }}
                    placeholder="Inherit"
                    className="w-20 font-mono text-xs"
                  />
                </div>

                {vp.label ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setActiveTab('roster');
                      setFilter('voiceParts', [vp.label]);
                    }}
                    className="flex items-center gap-1"
                    title={`Click to view the ${count} singer(s) in this voice part`}
                  >
                    <span className="font-bold">
                      {count} singer{count === 1 ? '' : 's'}
                    </span>
                  </Button>
                ) : (
                  <div className="h-9" />
                )}
                <Button
                  type="button"
                  variant="danger"
                  size="small"
                  onClick={() => {
                    setConfigVoiceParts(configVoiceParts.filter((_, idx) => idx !== index));
                  }}
                  disabled={isTied}
                  title={isTied ? 'Cannot delete voice part with assigned singers' : undefined}
                >
                  Delete
                </Button>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="secondary"
          className="self-start"
          onClick={() =>
            setConfigVoiceParts([...configVoiceParts, { label: '', fullName: '', sectionCode: '' }])
          }
        >
          + Add Voice Part
        </Button>
      </div>
    </AppCard>
  );
}
