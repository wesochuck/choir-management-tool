import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { MarkdownEditor } from '../common/MarkdownEditor';
import { AppCard } from '../common/AppCard';
import { Button } from '../ui/Button/Button';
import { Input } from '../ui';
import {
  settingsService,
  type LandingPageSettings,
  DEFAULT_LANDING_SETTINGS,
} from '../../services/settingsService';
import type EasyMDE from 'easymde';

export interface LandingPageSettingsPanelHandle {
  getSettings: () => LandingPageSettings;
  getHeroImageChanges: () => { file: File | null; removed: boolean };
  markSaved: (savedSettings: LandingPageSettings, savedHeroImageUrl: string | null) => void;
  reset: () => void;
}

interface LandingPageSettingsPanelProps {
  onDirtyChange: (isDirty: boolean) => void;
}

export const LandingPageSettingsPanel = forwardRef<
  LandingPageSettingsPanelHandle,
  LandingPageSettingsPanelProps
>(function LandingPageSettingsPanel({ onDirtyChange }, ref) {
  const [settings, setSettings] = useState<LandingPageSettings>({ ...DEFAULT_LANDING_SETTINGS });
  const [initialSettings, setInitialSettings] = useState<LandingPageSettings>({
    ...DEFAULT_LANDING_SETTINGS,
  });
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [initialHeroImageUrl, setInitialHeroImageUrl] = useState<string | null>(null);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroImageRemoved, setHeroImageRemoved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [heroError, setHeroError] = useState<string | null>(null);
  const aboutRef = useRef<EasyMDE | null>(null);
  const historyRef = useRef<EasyMDE | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  const revokeActiveBlob = () => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
  };

  const landingQuery = useQuery({
    queryKey: queryKeys.appSettings.landing,
    queryFn: () => settingsService.getLandingSettings(),
  });

  const heroImageQuery = useQuery({
    queryKey: queryKeys.appSettings.heroImage,
    queryFn: () => settingsService.getHeroImageUrl(),
  });

  useEffect(() => {
    if (loading && landingQuery.data && !heroImageQuery.isLoading) {
      setSettings(landingQuery.data);
      setInitialSettings(landingQuery.data);
      setHeroImageUrl(heroImageQuery.data ?? null);
      setInitialHeroImageUrl(heroImageQuery.data ?? null);
      setLoading(false);
    }
  }, [loading, landingQuery.data, heroImageQuery.data, heroImageQuery.isLoading]);

  useEffect(() => {
    return () => {
      revokeActiveBlob();
    };
  }, []);

  useEffect(() => {
    const dirty =
      settings.heroHeadline !== initialSettings.heroHeadline ||
      settings.heroSubtitle !== initialSettings.heroSubtitle ||
      settings.aboutUsText !== initialSettings.aboutUsText ||
      settings.historyText !== initialSettings.historyText ||
      settings.contactEmail !== initialSettings.contactEmail ||
      settings.showBrandingHeaderFooter !== initialSettings.showBrandingHeaderFooter ||
      heroImageFile !== null ||
      heroImageRemoved ||
      heroImageUrl !== initialHeroImageUrl;
    onDirtyChange(dirty);
  }, [
    settings,
    initialSettings,
    heroImageFile,
    heroImageRemoved,
    heroImageUrl,
    initialHeroImageUrl,
    onDirtyChange,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      getSettings: () => settings,
      getHeroImageChanges: () => ({ file: heroImageFile, removed: heroImageRemoved }),
      markSaved: (savedSettings, savedHeroImageUrl) => {
        revokeActiveBlob();
        setInitialSettings({ ...savedSettings });
        setInitialHeroImageUrl(savedHeroImageUrl);
        setHeroImageUrl(savedHeroImageUrl);
        setHeroImageFile(null);
        setHeroImageRemoved(false);
        setHeroError(null);
      },
      reset: () => {
        revokeActiveBlob();
        setSettings({ ...initialSettings });
        setHeroImageUrl(initialHeroImageUrl);
        setHeroImageFile(null);
        setHeroImageRemoved(false);
        setHeroError(null);
        aboutRef.current?.value(initialSettings.aboutUsText);
        historyRef.current?.value(initialSettings.historyText);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    }),
    [settings, initialSettings, initialHeroImageUrl, heroImageFile, heroImageRemoved]
  );

  const handleChange = <K extends keyof LandingPageSettings>(
    field: K,
    value: LandingPageSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleHeroFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setHeroError('Image must be under 5 MB.');
      return;
    }
    setHeroError(null);
    revokeActiveBlob();
    const blobUrl = URL.createObjectURL(file);
    activeBlobUrlRef.current = blobUrl;
    setHeroImageFile(file);
    setHeroImageRemoved(false);
    setHeroImageUrl(blobUrl);
  };

  const handleRemoveHero = () => {
    setHeroError(null);
    revokeActiveBlob();
    setHeroImageFile(null);
    setHeroImageRemoved(true);
    setHeroImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) return null;

  return (
    <AppCard title="Public Landing Page">
      <div className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Hero Image</label>
          {heroImageUrl && (
            <div className="mb-2">
              <img src={heroImageUrl} alt="Hero" className="max-h-48 rounded border" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="bg-primary-light text-primary-deep hover:bg-primary-deep/10 inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md px-4 font-sans text-xs font-semibold transition-colors active:translate-y-px">
              ⬆️
              {heroImageUrl ? 'Replace Hero Image' : 'Upload Hero Image'}
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleHeroFileChange}
              />
            </label>
            {heroImageUrl && (
              <Button variant="danger" size="small" onClick={handleRemoveHero}>
                Remove
              </Button>
            )}
          </div>
          {heroError && <p className="mt-1 text-xs text-red-500">{heroError}</p>}
          <p className="text-text-muted mt-1 text-xs">Recommended: 1200x600px. Max 5 MB.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Hero Headline</label>
          <Input
            type="text"
            value={settings.heroHeadline}
            onChange={(e) => handleChange('heroHeadline', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Hero Subtitle</label>
          <Input
            type="text"
            value={settings.heroSubtitle}
            onChange={(e) => handleChange('heroSubtitle', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">About Us Text</label>
          <MarkdownEditor
            value={settings.aboutUsText}
            onChange={(v) => handleChange('aboutUsText', v)}
            instanceRef={aboutRef}
            minHeight="200px"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">History Text</label>
          <MarkdownEditor
            value={settings.historyText}
            onChange={(v) => handleChange('historyText', v)}
            instanceRef={historyRef}
            minHeight="200px"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Contact Email</label>
          <Input
            type="email"
            value={settings.contactEmail}
            onChange={(e) => handleChange('contactEmail', e.target.value)}
            className="w-full"
            placeholder="contact@example.com"
          />
        </div>

        <div className="border-border mt-4 flex flex-row items-center gap-4 rounded-lg border bg-neutral-100 p-4">
          <input
            id="showBrandingHeaderFooter"
            type="checkbox"
            className="accent-primary size-[18px] cursor-pointer"
            checked={!!settings.showBrandingHeaderFooter}
            onChange={(e) => handleChange('showBrandingHeaderFooter', e.target.checked)}
          />
          <label
            htmlFor="showBrandingHeaderFooter"
            className="flex flex-1 cursor-pointer flex-col gap-0.5 select-none"
          >
            <span className="text-text text-sm leading-tight font-semibold">
              Wrap Ticketing, Donations, and Auditions in Site Layout
            </span>
            <span className="text-text-muted text-xs leading-tight">
              When checked, guest transactional pages will be decorated with the global header
              navigation and footer.
            </span>
          </label>
        </div>
      </div>
    </AppCard>
  );
});
