import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { settingsService, type LandingPageSettings } from '../../../services/settingsService';
import { Button } from '../../../components/ui';
import { useDialog } from '../../../contexts/DialogContext';
import { formatPocketBaseError } from '../../../lib/pocketbase';

interface PublicFeatureSetupProps {
  onSuccess: () => void;
}

export default function PublicFeatureSetup({ onSuccess }: PublicFeatureSetupProps) {
  const { data: currentSettings } = useQuery({
    queryKey: queryKeys.choirSettings.admin,
    queryFn: () => settingsService.getLandingSettings(),
  });

  const [heroHeadline, setHeroHeadline] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [aboutUsText, setAboutUsText] = useState('');
  const dialog = useDialog();

  useEffect(() => {
    if (currentSettings) {
      setHeroHeadline(currentSettings.heroHeadline || '');
      setHeroSubtitle(currentSettings.heroSubtitle || '');
      setAboutUsText(currentSettings.aboutUsText || '');
    }
  }, [currentSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await settingsService.saveLandingSettings({
        ...currentSettings,
        heroHeadline,
        heroSubtitle,
        aboutUsText,
      } as LandingPageSettings);
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: unknown) => {
      void dialog.showMessage({
        title: 'Website Settings Failed',
        message: formatPocketBaseError(error),
        variant: 'danger',
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100">Public Website settings</h3>
        <p className="text-sm text-slate-400">Configure your public-facing homepage branding.</p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Hero Headline
          </label>
          <input
            type="text"
            value={heroHeadline}
            onChange={(e) => setHeroHeadline(e.target.value)}
            className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100 outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex flex-col gap-1.5 pt-2">
          <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Hero Subtitle
          </label>
          <input
            type="text"
            value={heroSubtitle}
            onChange={(e) => setHeroSubtitle(e.target.value)}
            className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100 outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex flex-col gap-1.5 pt-2">
          <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            About Us Description
          </label>
          <textarea
            value={aboutUsText}
            onChange={(e) => setAboutUsText(e.target.value)}
            rows={4}
            className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100 outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
          Save & Next
        </Button>
      </div>
    </div>
  );
}
