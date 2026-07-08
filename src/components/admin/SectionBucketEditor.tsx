import { AppCard } from '../common/AppCard';
import type { SectionDef, VoicePartDef } from '../../services/settingsService';
import { isColorTooClose, getContrastColor } from '../../lib/colorUtils';
import { Button, Input, ColorPicker, Checkbox } from '../ui';

interface SectionBucketEditorProps {
  configSections: SectionDef[];
  setConfigSections: (sections: SectionDef[]) => void;
  configVoiceParts: VoicePartDef[];
}

export function SectionBucketEditor({
  configSections,
  setConfigSections,
  configVoiceParts,
}: SectionBucketEditorProps) {
  const isSectionReferenced = (code: string) => {
    return configVoiceParts.some((vp) => vp.sectionCode === code);
  };

  return (
    <AppCard title="Section Bucket Configurations">
      <div className="flex flex-col gap-4">
        <p className="mb-2 text-xs text-slate-500">
          Configure the section buckets for your choir (e.g. S, Sopranos) and their visual identity
          on the seating chart. Check "Learning Track Only" to exclude a section (and all its voice
          parts) from operational rosters (e.g., Soloists).
        </p>

        <div className="flex flex-col gap-3">
          {configSections.map((sec, index) => {
            const isTied = isSectionReferenced(sec.code);
            const hexBg = sec.color || sec.colorBg || '#e0e0e0';
            const tooClose = configSections.some((other, idx) => {
              if (idx === index) return false;
              const otherHex = other.color || other.colorBg;
              return isColorTooClose(hexBg, otherHex || '');
            });

            return (
              <div
                key={index}
                className="grid w-full grid-cols-[80px_1fr_180px_160px_85px] items-center gap-4"
              >
                <Input
                  value={sec.code}
                  onChange={(e) => {
                    const newSecs = [...configSections];
                    newSecs[index] = { ...newSecs[index], code: e.target.value };
                    setConfigSections(newSecs);
                  }}
                  placeholder="Code"
                  disabled={isTied}
                />
                <Input
                  value={sec.name}
                  onChange={(e) => {
                    const newSecs = [...configSections];
                    newSecs[index] = { ...newSecs[index], name: e.target.value };
                    setConfigSections(newSecs);
                  }}
                  placeholder="Name"
                />

                <div className="relative flex items-center gap-2">
                  <ColorPicker
                    value={hexBg}
                    onChange={(val) => {
                      const newSecs = [...configSections];
                      newSecs[index] = {
                        ...newSecs[index],
                        color: val,
                        colorBg: val,
                        colorText: getContrastColor(val),
                      };
                      setConfigSections(newSecs);
                    }}
                    size="small"
                    label=""
                  />

                  <Input
                    type="text"
                    value={sec.color || sec.colorBg || '#e0e0e0'}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (!val.startsWith('#') && val.length > 0) {
                        val = '#' + val;
                      }
                      val = '#' + val.replace(/[^0-9A-Fa-f]/g, '').substring(0, 6);

                      const newSecs = [...configSections];
                      newSecs[index] = {
                        ...newSecs[index],
                        color: val,
                        colorBg: val,
                        colorText: getContrastColor(val),
                      };
                      setConfigSections(newSecs);
                    }}
                    placeholder="#FFFFFF"
                    className="w-24 font-mono"
                  />

                  {tooClose && (
                    <span
                      title="Warning: This color lacks adequate visual contrast with another section color."
                      className="cursor-help text-sm text-red-600"
                    >
                      ⚠️
                    </span>
                  )}
                </div>

                <Checkbox
                  checked={sec.trackOnly || false}
                  onChange={(e) => {
                    const newSecs = [...configSections];
                    newSecs[index] = { ...newSecs[index], trackOnly: e.target.checked };
                    setConfigSections(newSecs);
                  }}
                >
                  Learning Track Only
                </Checkbox>

                <Button
                  type="button"
                  variant="danger"
                  size="small"
                  onClick={() => {
                    setConfigSections(configSections.filter((_, idx) => idx !== index));
                  }}
                  disabled={isTied}
                  title={isTied ? 'Cannot delete section referenced by a voice part' : undefined}
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
            setConfigSections([
              ...configSections,
              { code: '', name: '', color: '', colorBg: '', colorText: '' },
            ])
          }
        >
          + Add Section Bucket
        </Button>
      </div>
    </AppCard>
  );
}
