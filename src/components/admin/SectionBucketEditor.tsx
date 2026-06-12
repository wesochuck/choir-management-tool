import { AppCard } from '../common/AppCard';
import type { SectionDef, VoicePartDef } from '../../services/settingsService';
import { PALETTE_COLORS, isColorTooClose, getContrastColor } from '../../lib/colorUtils';
import { Button } from '../ui';

interface SectionBucketEditorProps {
  configSections: SectionDef[];
  setConfigSections: (sections: SectionDef[]) => void;
  configVoiceParts: VoicePartDef[];
  activeColorPickerIndex: number | null;
  setActiveColorPickerIndex: (index: number | null) => void;
}

export function SectionBucketEditor({
  configSections,
  setConfigSections,
  configVoiceParts,
  activeColorPickerIndex,
  setActiveColorPickerIndex,
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
                <input
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
                <input
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
                  <button
                    type="button"
                    onClick={() => setActiveColorPickerIndex(activeColorPickerIndex === index ? null : index)}
                    className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 shadow-sm transition-transform duration-100 hover:scale-105 active:scale-95"
                    // @allow-inline-style - dynamic color background
                    style={{ backgroundColor: hexBg }}
                    title="Choose color"
                  />

                  <input
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

                  {activeColorPickerIndex === index && (
                    <>
                      <div 
                        onClick={() => setActiveColorPickerIndex(null)}
                        // @allow-inline-style - full screen click handler
                        className="fixed inset-0 z-[100] cursor-default"
                      />
                      <div className="absolute top-full left-0 z-50 mt-2 flex w-48 flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Presets</span>
                        <div className="grid grid-cols-5 gap-1.5">
                          {PALETTE_COLORS.map(c => {
                            const isSelected = hexBg.toUpperCase() === c.toUpperCase();
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  const newSecs = [...configSections];
                                  newSecs[index] = { 
                                    ...newSecs[index], 
                                    color: c,
                                    colorBg: c,
                                    colorText: getContrastColor(c)
                                  };
                                  setConfigSections(newSecs);
                                  setActiveColorPickerIndex(null);
                                }}
                                className={`size-6 cursor-pointer rounded border border-slate-200 transition-transform hover:scale-105 active:scale-95 ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                // @allow-inline-style - dynamic background preset color
                                style={{ backgroundColor: c }}
                                title={c}
                              />
                            );
                          })}
                        </div>
                        
                        <div className="my-1 h-px bg-slate-100" />
                        
                        <label className="relative flex cursor-pointer items-center justify-center gap-2 rounded border border-slate-200 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50">
                          <span className="text-sm">🎨</span> Custom Color
                          <input 
                            type="color"
                            value={hexBg}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newSecs = [...configSections];
                              newSecs[index] = {
                                ...newSecs[index],
                                color: val,
                                colorBg: val,
                                colorText: getContrastColor(val)
                              };
                              setConfigSections(newSecs);
                            }}
                            className="pointer-events-none absolute inset-0 size-0 opacity-0"
                          />
                        </label>
                      </div>
                    </>
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
