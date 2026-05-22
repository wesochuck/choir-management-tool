import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppCard } from '../../components/common/AppCard';
import {
  DEFAULT_ATTENDANCE_SETTINGS,
  DEFAULT_ROSTER_SETTINGS,
  DEFAULT_MUSIC_LIBRARY_SETTINGS,
  DEFAULT_SEATING_SETTINGS,
  settingsService,
  type AttendanceSettings,
  type RosterSettings,
  type MusicLibrarySettings,
  type SeatingSettings,
  getVoicePartsAndSections,
  saveVoicePartsAndSections,
  type VoicePartDef,
  type SectionDef,
} from '../../services/settingsService';
import { profileService, type Profile } from '../../services/profileService';
import { useChoirName } from '../../hooks/useDocumentTitle';

function isColorTooClose(hex1: string, hex2: string): boolean {
  if (!hex1 || !hex2 || !hex1.startsWith('#') || !hex2.startsWith('#')) return false;
  const r1 = parseInt(hex1.substring(1, 3), 16);
  const g1 = parseInt(hex1.substring(3, 5), 16);
  const b1 = parseInt(hex1.substring(5, 7), 16);
  
  const r2 = parseInt(hex2.substring(1, 3), 16);
  const g2 = parseInt(hex2.substring(3, 5), 16);
  const b2 = parseInt(hex2.substring(5, 7), 16);
  
  const distance = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  return distance < 60; // Returns true if colors lack adequate visual contrast
}

function getContrastColor(hex: string): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return 'var(--text)';
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

export default function SettingsView() {
  const navigate = useNavigate();
  const { setChoirName: setContextChoirName } = useChoirName();
  const [choirName, setChoirName] = useState('');
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>(DEFAULT_ATTENDANCE_SETTINGS);
  const [rosterSettings, setRosterSettings] = useState<RosterSettings>(DEFAULT_ROSTER_SETTINGS);
  const [musicLibrarySettings, setMusicLibrarySettings] = useState<MusicLibrarySettings>(DEFAULT_MUSIC_LIBRARY_SETTINGS);
  const [seatingSettings, setSeatingSettings] = useState<SeatingSettings>(DEFAULT_SEATING_SETTINGS);
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const loadedChoirName = await settingsService.getChoirName();
      setChoirName(loadedChoirName);
      const attendance = await settingsService.getAttendanceSettings();
      setAttendanceSettings(attendance);
      const roster = await settingsService.getRosterSettings();
      setRosterSettings(roster);
      const musicLib = await settingsService.getMusicLibrarySettings();
      setMusicLibrarySettings(musicLib);
      const seating = await settingsService.getSeatingSettings();
      setSeatingSettings(seating);
      const settings = await getVoicePartsAndSections();
      setVoiceParts(settings.voiceParts);
      setSections(settings.sections);
      const allProfiles = await profileService.getProfiles();
      setProfiles(allProfiles);
      setIsLoading(false);
    };

    load().catch(() => {
      setMessage('Could not load settings.');
      setIsLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      await settingsService.saveChoirName(choirName);
      setContextChoirName(choirName);
      await settingsService.saveAttendanceSettings(attendanceSettings);
      await settingsService.saveRosterSettings(rosterSettings);
      await settingsService.saveMusicLibrarySettings(musicLibrarySettings);
      await settingsService.saveSeatingSettings(seatingSettings);
      await saveVoicePartsAndSections(voiceParts, sections);
      setMessage('Settings saved.');
    } catch {
      setMessage('Settings could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const getSingerCountForPart = (label: string) => {
    if (!label) return 0;
    return profiles.filter(p => p.voicePart === label).length;
  };

  const isSectionReferenced = (code: string) => {
    return voiceParts.some(vp => vp.sectionCode === code);
  };

  if (isLoading) return <div style={{ padding: 'var(--space-xl)' }}>Loading settings...</div>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-display" style={{ margin: 0 }}>Settings</h1>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {message && <div className="badge badge-rehearsal" style={{ alignSelf: 'flex-start' }}>{message}</div>}

      <AppCard title="Choir Name">
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Organization Name</label>
          <input
            id="choir-name"
            type="text"
            value={choirName}
            onChange={(event) => setChoirName(event.target.value)}
            placeholder="e.g. Downtown Community Chorale"
            className="card"
            style={{ width: '100%', maxWidth: '400px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
          />
          <p className="text-muted" style={{ margin: 0 }}>
            Displayed in the browser tab title across all pages (e.g. "Roster Management - My Choir").
          </p>
        </div>
      </AppCard>

      <AppCard title="Attendance Settings">
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Default Sorting Option</label>
          <select
            value={attendanceSettings.defaultSort}
            onChange={(event) => setAttendanceSettings({ defaultSort: event.target.value as 'lastName' | 'voicePart' })}
            className="card"
            style={{ width: '100%', maxWidth: '300px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
          >
            <option value="lastName">Last Name</option>
            <option value="voicePart">Voice Part + Last Name</option>
          </select>
          <p className="text-muted" style={{ margin: 0 }}>
            Choose the default sorting option used when opening the check-in sheet.
          </p>
        </div>
      </AppCard>

      <AppCard title="Roster Settings">
        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Default Status Filter</label>
            <select
              value={rosterSettings.defaultStatus}
              onChange={(event) => setRosterSettings({ ...rosterSettings, defaultStatus: event.target.value })}
              className="card"
              style={{ width: '100%', maxWidth: '300px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="">All Statuses</option>
              <option value="Active (Current)">Active (Current)</option>
              <option value="Active (Future)">Active (Future)</option>
              <option value="Inactive">Inactive</option>
            </select>
            <p className="text-muted" style={{ margin: 0 }}>
              Choose the default status filter used when opening the global roster.
            </p>
          </div>

          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Default Sorting Option</label>
            <select
              value={rosterSettings.defaultSort}
              onChange={(event) => setRosterSettings({ ...rosterSettings, defaultSort: event.target.value as 'lastName' | 'voicePart' })}
              className="card"
              style={{ width: '100%', maxWidth: '300px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="lastName">Last Name</option>
              <option value="voicePart">Voice Part + Last Name</option>
            </select>
            <p className="text-muted" style={{ margin: 0 }}>
              Choose the default sorting option used when opening the global roster.
            </p>
          </div>

          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Default RSVP Sorting Option</label>
            <select
              value={rosterSettings.defaultRsvpSort || 'lastName'}
              onChange={(event) => setRosterSettings({ ...rosterSettings, defaultRsvpSort: event.target.value as 'lastName' | 'voicePart' })}
              className="card"
              style={{ width: '100%', maxWidth: '300px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="lastName">Last Name</option>
              <option value="voicePart">Voice Part + Last Name</option>
            </select>
            <p className="text-muted" style={{ margin: 0 }}>
              Choose the default sorting option used when reviewing an event RSVP list.
            </p>
          </div>
        </div>
      </AppCard>

      <AppCard title="Season Management">
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Current Season</label>
          <input
            type="text"
            value={rosterSettings.currentSeason || ''}
            onChange={(event) => setRosterSettings({ ...rosterSettings, currentSeason: event.target.value })}
            placeholder="e.g. Fall 2026"
            className="card"
            style={{ width: '100%', maxWidth: '300px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
          />
          <p className="text-muted" style={{ margin: 0 }}>
            Set the active season for tracking dues in the roster view. Leave blank to disable dues tracking.
          </p>
        </div>
      </AppCard>

      <AppCard title="Music Library Settings">
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Catalog Lookup URL Template</label>
          <input
            type="url"
            value={musicLibrarySettings.catalogLookupUrlTemplate || ''}
            onChange={(event) => setMusicLibrarySettings({ ...musicLibrarySettings, catalogLookupUrlTemplate: event.target.value })}
            placeholder="https://example.com/catalog/{catalogId}"
            className="card"
            style={{ width: '100%', maxWidth: '400px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
          />
          <p className="text-muted" style={{ margin: 0 }}>
            Configure an external lookup URL format for Catalog IDs. Use <code>{'{catalogId}'}</code> as the placeholder for the Catalog ID number (e.g. <code>https://www.jwpepper.com/s?q={'{catalogId}'}</code>).
          </p>
        </div>
      </AppCard>

      <AppCard title="Music Library Genres">
        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <p className="text-muted" style={{ margin: 0 }}>
            Configure standard genre tags used for library organization and advanced layout filtering.
          </p>
          <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
            {musicLibrarySettings.genres?.map((genre, index) => (
              <div key={genre.id} style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                <input
                  className="card"
                  style={{ height: '40px', padding: '0 12px', width: '250px' }}
                  value={genre.label}
                  onChange={(e) => {
                    const updated = [...musicLibrarySettings.genres];
                    updated[index] = { ...updated[index], label: e.target.value };
                    setMusicLibrarySettings({ ...musicLibrarySettings, genres: updated });
                  }}
                />
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    const updated = musicLibrarySettings.genres.filter((_, i) => i !== index);
                    setMusicLibrarySettings({ ...musicLibrarySettings, genres: updated });
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
            <input
              id="new-genre-input"
              placeholder="New Genre Name (e.g. Sacred)"
              className="card"
              style={{ height: '40px', padding: '0 12px', maxWidth: '250px' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const inputEl = document.getElementById('new-genre-input') as HTMLInputElement;
                const label = inputEl?.value?.trim();
                if (!label) return;
                
                const normalized = label;
                const currentList = musicLibrarySettings.genres || [];
                if (currentList.some(g => g.label.toLowerCase() === normalized.toLowerCase())) {
                  alert('Genre label already exists.');
                  return;
                }
                
                const generatedId = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                let finalId = generatedId;
                let counter = 2;
                while (currentList.some(g => g.id === finalId)) {
                  finalId = `${generatedId}-${counter}`;
                  counter++;
                }
                
                const updated = [...currentList, { id: finalId, label: normalized }];
                setMusicLibrarySettings({ ...musicLibrarySettings, genres: updated });
                inputEl.value = '';
              }}
            >
              Add Genre
            </button>
          </div>
        </div>
      </AppCard>

      <AppCard title="Section Bucket Configurations">
        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <p className="text-muted" style={{ margin: 0 }}>
            Configure the section buckets for your choir (e.g. S, Sopranos) and their visual identity on the seating chart.
          </p>

          <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
            {sections.map((sec, index) => {
              const count = voiceParts.filter(vp => vp.sectionCode === sec.code).length;
              const isTied = isSectionReferenced(sec.code);
              
              const hexBg = sec.color || sec.colorBg || '#e0e0e0';
              const tooClose = sections.some((other, idx) => {
                if (idx === index) return false;
                const otherHex = other.color || other.colorBg;
                return isColorTooClose(hexBg, otherHex || '');
              });

              return (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 200px 100px 80px', gap: 'var(--space-sm)', alignItems: 'center', width: '100%' }}>
                  <input
                    value={sec.code}
                    onChange={(e) => {
                      const newSecs = [...sections];
                      newSecs[index] = { ...newSecs[index], code: e.target.value };
                      setSections(newSecs);
                    }}
                    placeholder="Code"
                    disabled={isTied}
                    className="card"
                    style={{ width: '100%', padding: '0 8px', height: '40px' }}
                  />
                  <input
                    value={sec.name}
                    onChange={(e) => {
                      const newSecs = [...sections];
                      newSecs[index] = { ...newSecs[index], name: e.target.value };
                      setSections(newSecs);
                    }}
                    placeholder="Name"
                    className="card"
                    style={{ width: '100%', padding: '0 8px', height: '40px' }}
                  />
                  
                  <div className="flex-col" style={{ gap: '2px' }}>
                    <div className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <input 
                        type="color" 
                        value={hexBg} 
                        onChange={(e) => {
                          const newSecs = [...sections];
                          const val = e.target.value;
                          newSecs[index] = { 
                            ...newSecs[index], 
                            color: val,
                            colorBg: val,
                            colorText: getContrastColor(val)
                          };
                          setSections(newSecs);
                        }}
                        style={{ width: '32px', height: '32px', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0 }}
                      />
                      <input 
                        type="text" 
                        value={sec.color || sec.colorBg || ''} 
                        placeholder="#FFFFFF"
                        onChange={(e) => {
                          const newSecs = [...sections];
                          const val = e.target.value;
                          newSecs[index] = { 
                            ...newSecs[index], 
                            color: val,
                            colorBg: val,
                            colorText: getContrastColor(val)
                          };
                          setSections(newSecs);
                        }}
                        className="card"
                        style={{ width: '90px', padding: '4px 8px', fontSize: '0.85rem', height: '32px' }}
                      />
                      {tooClose && (
                        <span title="Warning: This color lacks adequate visual contrast with another section color." style={{ color: 'var(--color-danger-text)', cursor: 'help' }}>⚠️</span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-light)', textAlign: 'center' }}>
                    {count} part{count === 1 ? '' : 's'}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSections(sections.filter((_, idx) => idx !== index));
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
            onClick={() => setSections([...sections, { code: '', name: '', color: '', colorBg: '', colorText: '' }])}
            className="btn btn-secondary"
            style={{ alignSelf: 'flex-start' }}
          >
            + Add Section Bucket
          </button>
        </div>
      </AppCard>

      <AppCard title="Seating Formations">
        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <p className="text-muted" style={{ margin: 0 }}>
            Define reusable seating formations for your choir.
          </p>

          <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
            {seatingSettings.formations?.map((formation, index) => (
              <div key={formation.id} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 2fr 80px', gap: 'var(--space-sm)', alignItems: 'center', width: '100%', padding: 'var(--space-sm)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg)' }}>
                <input
                  value={formation.name}
                  onChange={(e) => {
                    const newFormations = [...seatingSettings.formations];
                    newFormations[index] = { ...newFormations[index], name: e.target.value };
                    setSeatingSettings({ ...seatingSettings, formations: newFormations });
                  }}
                  placeholder="Formation Name"
                  className="card"
                  style={{ width: '100%', padding: '0 8px', height: '40px' }}
                />
                <select
                  value={formation.strategy}
                  onChange={(e) => {
                    const newFormations = [...seatingSettings.formations];
                    newFormations[index] = { ...newFormations[index], strategy: e.target.value as 'vertical_column' | 'horizontal_row' };
                    setSeatingSettings({ ...seatingSettings, formations: newFormations });
                  }}
                  className="card"
                  style={{ width: '100%', padding: '0 8px', height: '40px' }}
                >
                  <option value="vertical_column">Vertical Columns</option>
                  <option value="horizontal_row">Horizontal Rows</option>
                </select>
                <input
                  value={formation.sectionOrder.join(', ')}
                  onChange={(e) => {
                    const newFormations = [...seatingSettings.formations];
                    newFormations[index] = { ...newFormations[index], sectionOrder: e.target.value.split(',').map(s => s.trim().toUpperCase()) };
                    setSeatingSettings({ ...seatingSettings, formations: newFormations });
                  }}
                  placeholder="Order (e.g. S, A, T, B)"
                  className="card"
                  style={{ width: '100%', padding: '0 8px', height: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const newFormations = seatingSettings.formations.filter((_, idx) => idx !== index);
                    setSeatingSettings({ ...seatingSettings, formations: newFormations });
                  }}
                  className="btn btn-danger btn-sm"
                  style={{ height: '36px', minHeight: '36px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              const newId = `preset-${Date.now()}`;
              setSeatingSettings({
                ...seatingSettings,
                formations: [
                  ...(seatingSettings.formations || []),
                  { id: newId, name: 'New Formation', strategy: 'vertical_column', sectionOrder: sections.map(s => s.code) }
                ]
              });
            }}
            className="btn btn-secondary"
            style={{ alignSelf: 'flex-start' }}
          >
            + Add Formation Preset
          </button>
        </div>
      </AppCard>

      <AppCard title="Voice Part Configurations">
        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <p className="text-muted" style={{ margin: 0 }}>
            Configure the custom voice parts for the choir (e.g. S1, Soprano 1) and link them to a Section Bucket.
          </p>

          <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
            {voiceParts.map((vp, index) => {
              const count = getSingerCountForPart(vp.label);
              const isTied = count > 0;
              return (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 160px 120px 100px', gap: 'var(--space-md)', alignItems: 'center', width: '100%' }}>
                  <input
                    value={vp.label}
                    onChange={(e) => {
                      const newParts = [...voiceParts];
                      newParts[index] = { ...newParts[index], label: e.target.value };
                      setVoiceParts(newParts);
                    }}
                    placeholder="Label (e.g. S1)"
                    disabled={isTied}
                    className="card"
                    style={{ width: '100%', padding: '0 12px', height: '40px', minHeight: '40px' }}
                    title={isTied ? "Cannot change the label of a voice part with assigned singers" : undefined}
                  />
                  <input
                    value={vp.fullName}
                    onChange={(e) => {
                      const newParts = [...voiceParts];
                      newParts[index] = { ...newParts[index], fullName: e.target.value };
                      setVoiceParts(newParts);
                    }}
                    placeholder="Full Name (e.g. Soprano 1)"
                    className="card"
                    style={{ width: '100%', padding: '0 12px', height: '40px', minHeight: '40px' }}
                  />
                  <select
                    value={vp.sectionCode}
                    onChange={(e) => {
                      const newParts = [...voiceParts];
                      newParts[index] = { ...newParts[index], sectionCode: e.target.value };
                      setVoiceParts(newParts);
                    }}
                    className="card"
                    style={{ width: '100%', padding: '0 12px', height: '40px', minHeight: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                  >
                    <option value="">Select Section...</option>
                    {sections.map(s => (
                      <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                  {vp.label ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/roster?voicePart=${vp.label}`)}
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
                      setVoiceParts(voiceParts.filter((_, idx) => idx !== index));
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
            onClick={() => setVoiceParts([...voiceParts, { label: '', fullName: '', sectionCode: '' }])}
            className="btn btn-secondary"
            style={{ alignSelf: 'flex-start' }}
          >
            + Add Voice Part
          </button>
        </div>
      </AppCard>
    </div>
  );
}
