import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { AppCard } from '../../components/common/AppCard';
import { settingsService } from '../../services/settingsService';
import { useDialog } from '../../contexts/DialogContext';
import { calculateSettingsDirty } from '../../lib/settings/dirtyCheck';
import { FloatingSaveBar } from '../../components/admin/FloatingSaveBar';
import { LandingPageSettingsPanel } from '../../components/admin/LandingPageSettingsPanel';
import type { LandingPageSettingsPanelHandle } from '../../components/admin/LandingPageSettingsPanel';
import { Input } from '../../components/ui';

const inputClasses = 'max-w-lg';

export default function PublicWebsiteView() {
  const dialog = useDialog();
  const queryClient = useQueryClient();
  const [homepageUrl, setHomepageUrl] = useState('');
  const [landingDirty, setLandingDirty] = useState(false);
  const landingPanelRef = useRef<LandingPageSettingsPanelHandle>(null);
  const handleLandingDirtyChange = useCallback((dirty: boolean) => {
    setLandingDirty(dirty);
  }, []);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const landingSettings = landingPanelRef.current?.getSettings();
      const heroChanges = landingPanelRef.current?.getHeroImageChanges();

      await Promise.all([
        homepageUrl ? settingsService.saveHomepageUrl(homepageUrl) : Promise.resolve(),
        landingSettings ? settingsService.saveLandingSettings(landingSettings) : Promise.resolve(),
        heroChanges?.file
          ? settingsService.saveHeroImage(heroChanges.file)
          : heroChanges?.file === null
            ? settingsService.saveHeroImage(null)
            : Promise.resolve(),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.choirSettings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.appSettings.landing });
      queryClient.invalidateQueries({ queryKey: queryKeys.appSettings.heroImage });
    },
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.choirSettings.admin,
    queryFn: () => settingsService.getHomepageUrl(),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (settingsQuery.data !== undefined) {
      setHomepageUrl(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const isLoading = settingsQuery.isLoading;

  const loadedHomepageUrl = settingsQuery.data ?? '';
  const isDirty = useMemo(() => {
    const fieldsDirty = calculateSettingsDirty({ homepageUrl: loadedHomepageUrl }, { homepageUrl });
    return fieldsDirty || landingDirty;
  }, [loadedHomepageUrl, homepageUrl, landingDirty]);

  const handleGlobalDiscard = () => {
    setHomepageUrl(loadedHomepageUrl);
    landingPanelRef.current?.reset();
    setLandingDirty(false);
  };

  const handleSave = async () => {
    try {
      await saveSettingsMutation.mutateAsync();

      const landingSettings = landingPanelRef.current?.getSettings();
      const heroChanges = landingPanelRef.current?.getHeroImageChanges();

      const newHeroUrl =
        heroChanges?.file || heroChanges?.removed ? await settingsService.getHeroImageUrl() : null;

      landingPanelRef.current?.markSaved(
        landingSettings ?? (await settingsService.getLandingSettings()),
        newHeroUrl
      );

      dialog.showToast('Public website settings saved successfully.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await dialog.showMessage({
        title: 'Error',
        message: `Failed to save public website settings: ${message}`,
        variant: 'danger',
      });
    }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-4xl p-6">Loading public website settings...</div>;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6 pb-24">
      <div>
        <h1 className="text-text text-4xl font-bold tracking-tight">Public Website</h1>
        <p className="text-text-muted mt-2 text-sm">
          Configure the landing page, homepage redirect, and public-facing branding.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <AppCard title="Public Homepage URL">
          <div className="flex flex-col gap-2">
            <Input
              id="homepage-url"
              type="url"
              value={homepageUrl}
              onChange={(event) => setHomepageUrl(event.target.value)}
              placeholder="e.g. https://www.mychoir.org"
              className={inputClasses}
            />
            <p className="text-text-muted text-xs">
              The main public website address where applicants are redirected after submitting their
              audition sheet successfully.
            </p>
          </div>
        </AppCard>

        <LandingPageSettingsPanel ref={landingPanelRef} onDirtyChange={handleLandingDirtyChange} />
      </div>

      <FloatingSaveBar
        isDirty={isDirty}
        isSaving={saveSettingsMutation.isPending}
        onSave={handleSave}
        onDiscard={handleGlobalDiscard}
      />
    </div>
  );
}
