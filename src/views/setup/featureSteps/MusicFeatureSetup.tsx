import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import { settingsService } from '../../../services/settingsService';
import { Button } from '../../../components/ui';
import { useDialog } from '../../../contexts/DialogContext';
import { formatPocketBaseError } from '../../../lib/pocketbase';

interface MusicFeatureSetupProps {
  onSuccess: () => void;
}

export default function MusicFeatureSetup({ onSuccess }: MusicFeatureSetupProps) {
  const { data: currentSettings } = useQuery({
    queryKey: queryKeys.choirSettings.admin,
    queryFn: () => settingsService.getMusicLibrarySettings(),
  });

  const [genresText, setGenresText] = useState('Choral, Classical, Holiday, Pop');
  const [lookupUrl, setLookupUrl] = useState('');
  const dialog = useDialog();

  useEffect(() => {
    if (currentSettings) {
      if (currentSettings.genres) {
        setGenresText(currentSettings.genres.map((g) => g.label).join(', '));
      }
      if (currentSettings.catalogLookupUrlTemplate) {
        setLookupUrl(currentSettings.catalogLookupUrlTemplate);
      }
    }
  }, [currentSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const genres = genresText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((label) => ({
          id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          label,
        }));
      await settingsService.saveMusicLibrarySettings({
        ...currentSettings,
        genres,
        catalogLookupUrlTemplate: lookupUrl,
      });
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: unknown) => {
      void dialog.showMessage({
        title: 'Music Settings Failed',
        message: formatPocketBaseError(error),
        variant: 'danger',
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100">Music Library Settings</h3>
        <p className="text-sm text-slate-400">
          Configure catalog lookup templates and standard genres.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Music Catalog Genres
          </label>
          <input
            type="text"
            value={genresText}
            onChange={(e) => setGenresText(e.target.value)}
            className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100 outline-none focus:border-teal-500"
          />
          <span className="text-xs text-slate-400">Comma-separated list of catalog genres.</span>
        </div>

        <div className="flex flex-col gap-1.5 pt-2">
          <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Catalog Lookup URL Template
          </label>
          <input
            type="text"
            value={lookupUrl}
            placeholder="e.g. https://www.jwpepper.com/sheet-music/search.jsp?keywords={title}"
            onChange={(e) => setLookupUrl(e.target.value)}
            className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100 outline-none focus:border-teal-500"
          />
          <span className="text-xs text-slate-400">
            Optional template link to perform automatic sheet music catalog lookups.
          </span>
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
