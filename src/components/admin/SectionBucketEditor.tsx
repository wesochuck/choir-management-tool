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
      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        <p className="text-muted" style={{ margin: 0 }}>
          Configure the section buckets for your choir (e.g. S, Sopranos) and their visual identity on the seating chart.
        </p>

        <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
          {configSections.map((sec, index) => {
            const isTied = isSectionReferenced(sec.code);
            const hexBg = sec.color || sec.colorBg || '#e0e0e0';
            const tooClose = configSections.some((other, idx) => {
              if (idx === index) return false;
              const otherHex = other.color || other.colorBg;
              return isColorTooClose(hexBg, otherHex || '');
            });

            return (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 200px 80px', gap: 'var(--space-md)', alignItems: 'center', width: '100%' }}>
                <input
                  value={sec.code}
                  onChange={(e) => {
                    const newSecs = [...configSections];
                    newSecs[index] = { ...newSecs[index], code: e.target.value };
                    setConfigSections(newSecs);
                  }}
                  placeholder="Code"
                  disabled={isTied}
                  className="card"
                  style={{ width: '100%', padding: '0 8px', height: '40px' }}
                />
                <input
                  value={sec.name}
                  onChange={(e) => {
                    const newSecs = [...configSections];
                    newSecs[index] = { ...newSecs[index], name: e.target.value };
                    setConfigSections(newSecs);
                  }}
                  placeholder="Name"
                  className="card"
                  style={{ width: '100%', padding: '0 8px', height: '40px' }}
                />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setActiveColorPickerIndex(activeColorPickerIndex === index ? null : index)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: hexBg,
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      padding: 0,
                      boxShadow: 'var(--shadow-sm)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.1s ease',
                    }}
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
                    className="card"
                    style={{ 
                      width: '90px', 
                      padding: '0 8px', 
                      height: '32px', 
                      fontFamily: 'var(--font-mono, monospace)', 
                      fontSize: '12px',
                      margin: 0
                    }}
                  />

                  {tooClose && (
                    <span title="Warning: This color lacks adequate visual contrast with another section color." style={{ color: 'var(--color-danger-text)', cursor: 'help', fontSize: '14px' }}>⚠️</span>
                  )}

                  {activeColorPickerIndex === index && (
                    <>
                      <div 
                        onClick={() => setActiveColorPickerIndex(null)}
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
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        backgroundColor: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md, 8px)',
                        padding: '12px',
                        boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))',
                        zIndex: 101,
                        width: '180px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-light)', textTransform: 'uppercase' }}>Presets</span>
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
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  backgroundColor: c,
                                  border: isSelected ? '2px solid var(--text-main, #000000)' : '1px solid var(--border)',
                                  cursor: 'pointer',
                                  padding: 0,
                                  flexShrink: 0,
                                  transition: 'transform 0.1s ease',
                                  transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                                }}
                                title={c}
                              />
                            );
                          })}
                        </div>
                        
                        <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />
                        
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          fontSize: '12px', 
                          cursor: 'pointer',
                          color: 'var(--text-main)',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          justifyContent: 'center',
                          backgroundColor: 'var(--bg-light, #f9fafb)',
                          textAlign: 'center',
                          margin: 0
                        }}>
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
                  className="btn btn-danger btn-sm"
                  style={{ height: '36px', minHeight: '36px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
          className="btn btn-secondary"
          style={{ alignSelf: 'flex-start' }}
        >
          + Add Section Bucket
        </button>
      </div>
    </AppCard>
  );
}
