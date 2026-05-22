import { useEffect, useMemo, useState } from 'react';
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
import { useDialog } from '../../contexts/DialogContext';
import { calculateSettingsDirty } from '../../lib/settings/dirtyCheck';
import { FloatingSaveBar } from '../../components/admin/FloatingSaveBar';

interface SettingsState {
  choirName: string;
  attendance: AttendanceSettings;
  roster: RosterSettings;
  musicLibrary: MusicLibrarySettings;
  seating: SeatingSettings;
  sections: SectionDef[];
  voiceParts: VoicePartDef[];
}


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

const PALETTE_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B', // Slate
];

export default function SettingsView() {
  const navigate = useNavigate();
  const dialog = useDialog();
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
  const [initialSettings, setInitialSettings] = useState<SettingsState | null>(null);
  const [activeColorPickerIndex, setActiveColorPickerIndex] = useState<number | null>(null);

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

      const state: SettingsState = {
        choirName: loadedChoirName,
        attendance,
        roster,
        musicLibrary: musicLib,
        seating,
        sections: settings.sections,
        voiceParts: settings.voiceParts,
      };
      setInitialSettings(JSON.parse(JSON.stringify(state)));

      setIsLoading(false);
    };

    load().catch(() => {
      setMessage('Could not load settings.');
      setIsLoading(false);
    });
  }, []);

  const isDirty = useMemo(() => {
    if (!initialSettings) return false;
    return calculateSettingsDirty(initialSettings, {
      choirName,
      attendance: attendanceSettings,
      roster: rosterSettings,
      musicLibrary: musicLibrarySettings,
      seating: seatingSettings,
      sections,
      voiceParts,
    });
  }, [initialSettings, choirName, attendanceSettings, rosterSettings, musicLibrarySettings, seatingSettings, sections, voiceParts]);

  const handleGlobalDiscard = () => {
    if (!initialSettings) return;
    setChoirName(initialSettings.choirName);
    setAttendanceSettings(initialSettings.attendance);
    setRosterSettings(initialSettings.roster);
    setMusicLibrarySettings(initialSettings.musicLibrary);
    setSeatingSettings(initialSettings.seating);
    setSections(initialSettings.sections);
    setVoiceParts(initialSettings.voiceParts);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');

    // Validate Sections
    const seenSectionCodes = new Set<string>();
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const code = sec.code.trim().toUpperCase();
      const name = sec.name.trim();
      
      if (!code) {
        setMessage('Error: Section bucket code cannot be empty.');
        setIsSaving(false);
        return;
      }
      if (seenSectionCodes.has(code)) {
        setMessage(`Error: Duplicate section bucket code "${code}".`);
        setIsSaving(false);
        return;
      }
      seenSectionCodes.add(code);
      if (!name) {
        setMessage(`Error: Section bucket "${code}" name cannot be empty.`);
        setIsSaving(false);
        return;
      }
    }

    // Validate Seating Formations
    const formations = seatingSettings.formations || [];
    if (formations.length === 0) {
      setMessage('Error: At least one seating formation must be defined.');
      setIsSaving(false);
      return;
    }

    const seenFormationNames = new Set<string>();
    for (let i = 0; i < formations.length; i++) {
      const form = formations[i];
      const name = form.name.trim();
      if (!name) {
        setMessage(`Error: Seating formation name at position ${i + 1} cannot be empty.`);
        setIsSaving(false);
        return;
      }
      const lowerName = name.toLowerCase();
      if (seenFormationNames.has(lowerName)) {
        setMessage(`Error: Seating formation name "${name}" is duplicated.`);
        setIsSaving(false);
        return;
      }
      seenFormationNames.add(lowerName);

      // Clean/sanitize sectionOrder: split, trim, filter empty
      const codes = form.sectionOrder.map(c => c.trim().toUpperCase()).filter(Boolean);
      if (codes.length === 0) {
        setMessage(`Error: Seating formation "${name}" must have at least one section code.`);
        setIsSaving(false);
        return;
      }

      // Check if codes exist in the active sections list
      for (const code of codes) {
        if (!seenSectionCodes.has(code)) {
          setMessage(`Error: Seating formation "${name}" contains unknown section code "${code}". Valid codes: ${Array.from(seenSectionCodes).join(', ')}`);
          setIsSaving(false);
          return;
        }
      }
    }

    // Validate Voice Parts
    const seenPartLabels = new Set<string>();
    for (let i = 0; i < voiceParts.length; i++) {
      const vp = voiceParts[i];
      const label = vp.label.trim();
      const fullName = vp.fullName.trim();
      const secCode = vp.sectionCode.trim().toUpperCase();

      if (!label) {
        setMessage('Error: Voice part label cannot be empty.');
        setIsSaving(false);
        return;
      }
      if (seenPartLabels.has(label)) {
        setMessage(`Error: Duplicate voice part label "${label}".`);
        setIsSaving(false);
        return;
      }
      seenPartLabels.add(label);
      if (!fullName) {
        setMessage(`Error: Voice part "${label}" full name cannot be empty.`);
        setIsSaving(false);
        return;
      }
      if (!secCode) {
        setMessage(`Error: Voice part "${label}" must belong to a section bucket.`);
        setIsSaving(false);
        return;
      }
      if (!seenSectionCodes.has(secCode)) {
        setMessage(`Error: Voice part "${label}" belongs to unknown section bucket "${secCode}".`);
        setIsSaving(false);
        return;
      }
    }

    try {
      await settingsService.saveChoirName(choirName);
      setContextChoirName(choirName);
      await settingsService.saveAttendanceSettings(attendanceSettings);
      await settingsService.saveRosterSettings(rosterSettings);
      await settingsService.saveMusicLibrarySettings(musicLibrarySettings);
      await settingsService.saveSeatingSettings(seatingSettings);
      await saveVoicePartsAndSections(voiceParts, sections);

      const state: SettingsState = {
        choirName,
        attendance: attendanceSettings,
        roster: rosterSettings,
        musicLibrary: musicLibrarySettings,
        seating: seatingSettings,
        sections,
        voiceParts,
      };
      setInitialSettings(JSON.parse(JSON.stringify(state)));

      setMessage('Settings saved.');
      await dialog.showMessage({ title: 'Success', message: 'All settings saved successfully.' });
    } catch {
      setMessage('Settings could not be saved.');
      await dialog.showMessage({ title: 'Error', message: 'Failed to save settings modifications.', variant: 'danger' });
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
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setActiveColorPickerIndex(activeColorPickerIndex === index ? null : index)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
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
                        
                        const newSecs = [...sections];
                        newSecs[index] = { 
                          ...newSecs[index], 
                          color: val,
                          colorBg: val,
                          colorText: getContrastColor(val)
                        };
                        setSections(newSecs);
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
                                    const newSecs = [...sections];
                                    newSecs[index] = { 
                                      ...newSecs[index], 
                                      color: c,
                                      colorBg: c,
                                      colorText: getContrastColor(c)
                                    };
                                    setSections(newSecs);
                                    setActiveColorPickerIndex(null);
                                  }}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: c,
                                    border: isSelected ? '2px solid var(--text-main, #000000)' : '1px solid var(--border)',
                                    cursor: 'pointer',
                                    padding: 0,
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
                                const newSecs = [...sections];
                                newSecs[index] = {
                                  ...newSecs[index],
                                  color: val,
                                  colorBg: val,
                                  colorText: getContrastColor(val)
                                };
                                setSections(newSecs);
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

            {seatingSettings.formations?.map((formation, index) => {
              return (
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
                  <div 
                    className="flex-row" 
                    style={{ 
                      alignItems: 'center', 
                      gap: 'var(--space-xs)', 
                      flexWrap: 'wrap', 
                      width: '100%', 
                      minHeight: '40px', 
                      padding: '4px var(--space-sm)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius-md)', 
                      backgroundColor: 'var(--card-bg)' 
                    }}
                  >
                    {formation.sectionOrder.map((code, secIdx) => {
                      const sec = sections.find(s => s.code.toUpperCase() === code.toUpperCase());
                      const hasSec = !!sec;
                      
                      // Fallback colors for unknown codes
                      const bgColor = hasSec ? (sec.color || sec.colorBg || 'var(--border)') : '#fee2e2';
                      const textColor = hasSec ? (sec.colorText || '#000000') : '#991b1b';
                      const borderStyle = hasSec ? '1px solid rgba(0,0,0,0.1)' : '1px solid #ef4444';

                      return (
                        <div
                          key={secIdx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: bgColor,
                            color: textColor,
                            border: borderStyle,
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {!hasSec && <span title="Unknown section bucket! Click 'x' to remove." style={{ cursor: 'help' }}>⚠️</span>}
                            {code}
                          </span>
                          
                          {/* Reordering and removal controls */}
                          <div 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '2px', 
                              marginLeft: '4px', 
                              borderLeft: '1px solid rgba(0,0,0,0.15)', 
                              paddingLeft: '4px' 
                            }}
                          >
                            {secIdx > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newFormations = [...seatingSettings.formations];
                                  const order = [...newFormations[index].sectionOrder];
                                  const temp = order[secIdx];
                                  order[secIdx] = order[secIdx - 1];
                                  order[secIdx - 1] = temp;
                                  newFormations[index] = { ...newFormations[index], sectionOrder: order };
                                  setSeatingSettings({ ...seatingSettings, formations: newFormations });
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'inherit',
                                  cursor: 'pointer',
                                  padding: '0 2px',
                                  fontSize: '0.8rem',
                                  opacity: 0.7,
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                title="Move Left"
                              >
                                ◀
                              </button>
                            )}
                            {secIdx < formation.sectionOrder.length - 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newFormations = [...seatingSettings.formations];
                                  const order = [...newFormations[index].sectionOrder];
                                  const temp = order[secIdx];
                                  order[secIdx] = order[secIdx + 1];
                                  order[secIdx + 1] = temp;
                                  newFormations[index] = { ...newFormations[index], sectionOrder: order };
                                  setSeatingSettings({ ...seatingSettings, formations: newFormations });
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'inherit',
                                  cursor: 'pointer',
                                  padding: '0 2px',
                                  fontSize: '0.8rem',
                                  opacity: 0.7,
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                title="Move Right"
                              >
                                ▶
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const newFormations = [...seatingSettings.formations];
                                const order = newFormations[index].sectionOrder.filter((_, sIdx) => sIdx !== secIdx);
                                newFormations[index] = { ...newFormations[index], sectionOrder: order };
                                setSeatingSettings({ ...seatingSettings, formations: newFormations });
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'inherit',
                                cursor: 'pointer',
                                padding: '0 2px',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                opacity: 0.7,
                                display: 'flex',
                                alignItems: 'center',
                                marginLeft: '2px',
                              }}
                              title="Remove"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add dropdown styled beautifully */}
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <select
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const newFormations = [...seatingSettings.formations];
                          newFormations[index] = {
                            ...newFormations[index],
                            sectionOrder: [...newFormations[index].sectionOrder, val]
                          };
                          setSeatingSettings({ ...seatingSettings, formations: newFormations });
                        }}
                        style={{
                          opacity: 0,
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          cursor: 'pointer',
                          zIndex: 2,
                        }}
                        title="Add section to order"
                      >
                        <option value="" disabled>+ Add Section</option>
                        {sections.filter(s => s.code).map(s => (
                          <option key={s.code} value={s.code}>
                            {s.name ? `${s.name} (${s.code})` : s.code}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '2px 8px',
                          height: '28px',
                          fontSize: '0.8rem',
                          border: '1px dashed var(--border)',
                          backgroundColor: 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          pointerEvents: 'none',
                        }}
                      >
                        + Add Section
                      </button>
                    </div>
                  </div>
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
              );
            })}

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

      <FloatingSaveBar 
        isDirty={isDirty} 
        isSaving={isSaving} 
        onSave={handleSave} 
        onDiscard={handleGlobalDiscard} 
      />
    </div>
  );
}
