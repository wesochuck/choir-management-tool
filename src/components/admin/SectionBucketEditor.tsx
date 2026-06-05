import { AppCard } from '../common/AppCard';
import type { SectionDef, VoicePartDef } from '../../services/settingsService';
import { PALETTE_COLORS, isColorTooClose, getContrastColor } from '../../lib/colorUtils';

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
      <div className="admin-settings-group">
        <p className="text-muted admin-settings-description">
          Configure the section buckets for your choir (e.g. S, Sopranos) and their visual identity on the seating chart.
        </p>

        <div className="admin-settings-field">
          {configSections.map((sec, index) => {
            const isTied = isSectionReferenced(sec.code);
            const hexBg = sec.color || sec.colorBg || '#e0e0e0';
            const tooClose = configSections.some((other, idx) => {
              if (idx === index) return false;
              const otherHex = other.color || other.colorBg;
              return isColorTooClose(hexBg, otherHex || '');
            });

            return (
              <div key={index} className="admin-section-bucket-grid">
                <input
                  value={sec.code}
                  onChange={(e) => {
                    const newSecs = [...configSections];
                    newSecs[index] = { ...newSecs[index], code: e.target.value };
                    setConfigSections(newSecs);
                  }}
                  placeholder="Code"
                  disabled={isTied}
                  className="card admin-settings-input-full"
                />
                <input
                  value={sec.name}
                  onChange={(e) => {
                    const newSecs = [...configSections];
                    newSecs[index] = { ...newSecs[index], name: e.target.value };
                    setConfigSections(newSecs);
                  }}
                  placeholder="Name"
                  className="card admin-settings-input-full"
                />
                
                {/* @allow-inline-style */}
                <div className="admin-flex-center-lg" style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setActiveColorPickerIndex(activeColorPickerIndex === index ? null : index)}
                    className="admin-color-preview"
                    // @allow-inline-style
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
                    className="card admin-color-hex-input-lg"
                  />

                  {tooClose && (
                    // @allow-inline-style
                    <span title="Warning: This color lacks adequate visual contrast with another section color." style={{ color: 'var(--color-danger-text)', cursor: 'help', fontSize: '14px' }}>⚠️</span>
                  )}

                  {activeColorPickerIndex === index && (
                    <>
                      <div 
                        onClick={() => setActiveColorPickerIndex(null)}
                        // @allow-inline-style
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 100,
                          cursor: 'default'
                        }}
                      />
                      <div className="admin-color-picker-popover">
                        {/* @allow-inline-style */}
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-light)', textTransform: 'uppercase' }}>Presets</span>
                        {/* @allow-inline-style */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
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
                                className={`admin-color-preset-btn ${isSelected ? 'selected' : ''}`}
                                // @allow-inline-style
                                style={{ backgroundColor: c }}
                                title={c}
                              />
                            );
                          })}
                        </div>
                        
                        {/* @allow-inline-style */}
                        <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />
                        
                        <label className="admin-color-custom-btn">
                          {/* @allow-inline-style */}
                          <span style={{ fontSize: '14px' }}>🎨</span> Custom Color
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
                            // @allow-inline-style
                            style={{ 
                              position: 'absolute',
                              width: 0,
                              height: 0,
                              opacity: 0,
                              pointerEvents: 'none'
                            }}
                          />
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setConfigSections(configSections.filter((_, idx) => idx !== index));
                  }}
                  disabled={isTied}
                  className="btn btn-danger btn-sm admin-action-btn-sm"
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setConfigSections([...configSections, { code: '', name: '', color: '', colorBg: '', colorText: '' }])}
          className="btn btn-secondary admin-align-start"
        >
          + Add Section Bucket
        </button>
      </div>
    </AppCard>
  );
}
