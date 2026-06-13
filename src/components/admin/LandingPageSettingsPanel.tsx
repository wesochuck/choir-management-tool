import React, { useState, useEffect, useRef } from 'react';
import { MarkdownEditor } from '../common/MarkdownEditor';
import { AppCard } from '../common/AppCard';
import { Button } from '../ui/Button/Button';
import { settingsService, type LandingPageSettings, DEFAULT_LANDING_SETTINGS } from '../../services/settingsService';
import type EasyMDE from 'easymde';

interface LandingPageSettingsPanelProps {
  onDirtyChange: (isDirty: boolean) => void;
  onSave: () => Promise<void>;
  onDiscard: () => void;
}

export function LandingPageSettingsPanel({
  onDirtyChange,
  onSave,
  onDiscard,
}: LandingPageSettingsPanelProps) {
  const [settings, setSettings] = useState<LandingPageSettings>({ ...DEFAULT_LANDING_SETTINGS });
  const [initialSettings, setInitialSettings] = useState<LandingPageSettings>({ ...DEFAULT_LANDING_SETTINGS });
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [initialHeroImageUrl, setInitialHeroImageUrl] = useState<string | null>(null);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroImageRemoved, setHeroImageRemoved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heroError, setHeroError] = useState<string | null>(null);
  const aboutRef = useRef<EasyMDE | null>(null);
  const historyRef = useRef<EasyMDE | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [s, imgUrl] = await Promise.all([
          settingsService.getLandingSettings(),
          settingsService.getHeroImageUrl(),
        ]);
        setSettings(s);
        setInitialSettings(s);
        setHeroImageUrl(imgUrl);
        setInitialHeroImageUrl(imgUrl);
      } catch (err: unknown) {
        console.error('Failed to load landing page settings', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const dirty =
      settings.heroHeadline !== initialSettings.heroHeadline ||
      settings.heroSubtitle !== initialSettings.heroSubtitle ||
      settings.aboutUsText !== initialSettings.aboutUsText ||
      settings.historyText !== initialSettings.historyText ||
      settings.contactEmail !== initialSettings.contactEmail ||
      heroImageFile !== null ||
      heroImageRemoved ||
      heroImageUrl !== initialHeroImageUrl;
    onDirtyChange(dirty);
  }, [settings, initialSettings, heroImageFile, heroImageRemoved, heroImageUrl, initialHeroImageUrl, onDirtyChange]);

  const handleChange = (field: keyof LandingPageSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleHeroFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setHeroError('Image must be under 5 MB.');
      return;
    }
    setHeroError(null);
    setHeroImageFile(file);
    setHeroImageRemoved(false);
    setHeroImageUrl(URL.createObjectURL(file));
  };

  const handleRemoveHero = () => {
    setHeroError(null);
    setHeroImageFile(null);
    setHeroImageRemoved(true);
    setHeroImageUrl(null);
    const fileInput = document.getElementById('hero-image-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.saveLandingSettings(settings);
      if (heroImageRemoved) {
        await settingsService.saveHeroImage(null);
      } else if (heroImageFile) {
        await settingsService.saveHeroImage(heroImageFile);
      }
      setInitialSettings({ ...settings });
      setInitialHeroImageUrl(heroImageUrl);
      setHeroImageFile(null);
      setHeroImageRemoved(false);
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setSettings({ ...initialSettings });
    setHeroImageUrl(initialHeroImageUrl);
    setHeroImageFile(null);
    setHeroImageRemoved(false);
    setHeroError(null);
    aboutRef.current?.value(initialSettings.aboutUsText);
    historyRef.current?.value(initialSettings.historyText);
    onDiscard();
  };

  if (loading) return null;

  return (
    <AppCard title="Public Landing Page">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Hero Image</label>
          {heroImageUrl && (
            <div className="mb-2">
              <img src={heroImageUrl} alt="Hero" className="max-h-48 rounded border" />
            </div>
          )}
          <div className="flex gap-2">
            <input
              id="hero-image-input"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleHeroFileChange}
              className="text-sm"
            />
            {heroImageUrl && (
              <Button variant="secondary" onClick={handleRemoveHero} disabled={saving}>
                Remove
              </Button>
            )}
          </div>
          {heroError && <p className="text-red-500 text-xs mt-1">{heroError}</p>}
          <p className="text-xs text-text-muted mt-1">Recommended: 1200x600px. Max 5 MB.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Hero Headline</label>
          <input
            type="text"
            value={settings.heroHeadline}
            onChange={e => handleChange('heroHeadline', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-bg-input text-text"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Hero Subtitle</label>
          <input
            type="text"
            value={settings.heroSubtitle}
            onChange={e => handleChange('heroSubtitle', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-bg-input text-text"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">About Us Text</label>
          <MarkdownEditor
            value={settings.aboutUsText}
            onChange={v => handleChange('aboutUsText', v)}
            instanceRef={aboutRef}
            minHeight="200px"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">History Text</label>
          <MarkdownEditor
            value={settings.historyText}
            onChange={v => handleChange('historyText', v)}
            instanceRef={historyRef}
            minHeight="200px"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contact Email</label>
          <input
            type="email"
            value={settings.contactEmail}
            onChange={e => handleChange('contactEmail', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-bg-input text-text"
            placeholder="contact@example.com"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="secondary" onClick={handleDiscard} disabled={saving}>
            Discard
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </AppCard>
  );
}
