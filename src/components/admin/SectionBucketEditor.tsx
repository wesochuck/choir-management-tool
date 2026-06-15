import { AppCard } from '../common/AppCard';
import type { SectionDef, VoicePartDef } from '../../services/settingsService';
import { isColorTooClose, getContrastColor } from '../../lib/colorUtils';
import { Button, Input } from '../ui';
import SlColorPicker from '@shoelace-style/shoelace/dist/react/color-picker/index.js';

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
    return configVoiceParts.some(vp => vp.sectionCode === code);
  };

  return (
    <AppCard title="Section Bucket Configurations">
      <div className="flex flex-col gap-4">
        <p className="mb-2 text-xs text-slate-500">
          Configure the section buckets for your choir (e.g. S, Sopranos) and their visual identity on the seating chart.
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
              <div key={index} className="grid w-full grid-cols-[80px_1fr_180px_85px] items-center gap-4">
                <Input
                  value={sec.code}
                  onChange={(e) => {
                    const newSecs = [...configSections];
                    newSecs[index] = { ...newSecs[index], code: e.target.value };
                    setConfigSections(newSecs);
                  }}
                  placeholder="Code"
                  disabled={isTied}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                />
                <Input
                  value={sec.name}
                  onChange={(e) => {
                    const newSecs = [...configSections];
                    newSecs[index] = { ...newSecs[index], name: e.target.value };
                    setConfigSections(newSecs);
                  }}
                  placeholder="Name"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
                
                <div className="relative flex items-center gap-2">
                  <SlColorPicker
                    value={hexBg}
                    onSlChange={(e: unknown) => {
                      const val = (e as CustomEvent).detail.value;
                      const newSecs = [...configSections];
                      newSecs[index] = {
                        ...newSecs[index],
                        color: val,
                        colorBg: val,
                        colorText: getContrastColor(val)
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
                        colorText: getContrastColor(val)
                      };
                      setConfigSections(newSecs);
                    }}
                    placeholder="#FFFFFF"
                    className="h-10 w-24 rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm text-slate-800 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
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

                <Button
                  type="button"
                  variant="danger"
                  size="small"
                  onClick={() => {
                    setConfigSections(configSections.filter((_, idx) => idx !== index));
                  }}
                  disabled={isTied}
                  title={isTied ? "Cannot delete section referenced by a voice part" : undefined}
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
          onClick={() => setConfigSections([...configSections, { code: '', name: '', color: '', colorBg: '', colorText: '' }])}
        >
          + Add Section Bucket
        </Button>
      </div>
    </AppCard>
  );
}
