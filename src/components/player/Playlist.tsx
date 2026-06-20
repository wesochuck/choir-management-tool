import React from 'react';
import type { PlayerMediaFile } from '../../services/playerService';
import { Button } from '../ui/Button/Button';

const MusicIcon = () => '🎵';

interface PlaylistProps {
  playlist: PlayerMediaFile[];
  currentIndex: number;
  onTrackSelect: (index: number) => void;
  onSaveTrackOffline: (track: PlayerMediaFile) => void;
  onRemoveOffline: (track: PlayerMediaFile) => void;
  onDownloadTrackFile: (track: PlayerMediaFile) => void;
  downloadProgress: Record<string, number>;
  selectedVoicePart?: string;
  onSaveAllOffline: () => void;
  onDownloadAllFiles: () => void;
  onClearAll: () => void;
  isSavingAllOffline: boolean;
}

export const Playlist: React.FC<PlaylistProps> = ({
  playlist,
  currentIndex,
  onTrackSelect,
  onSaveTrackOffline,
  onRemoveOffline,
  onDownloadTrackFile,
  downloadProgress,
  selectedVoicePart,
  onSaveAllOffline,
  onDownloadAllFiles,
  onClearAll,
  isSavingAllOffline,
}) => {
  if (playlist.length === 0) return null;

  const audioTracks = playlist.filter((f) => !f.isFolder);
  const downloadedCount = audioTracks.filter((f) => f.isDownloaded).length;
  const totalCount = audioTracks.length;
  const allDownloaded = downloadedCount === totalCount && totalCount > 0;

  return (
    <div className="border-border bg-surface relative mt-6 max-h-[500px] overflow-y-auto rounded-xl border shadow-md max-sm:max-h-none max-sm:overflow-y-visible max-sm:rounded-lg">
      {/* Set List Header with actions and helper explanation text */}
      <div className="border-border bg-surface sticky top-0 z-10 flex flex-col gap-3 border-b px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-text m-0 text-base font-bold whitespace-nowrap">Set List</h3>
            <p className="text-text-muted m-0 text-xs tabular-nums">
              {totalCount} {totalCount === 1 ? 'track' : 'tracks'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
            {downloadedCount > 0 && (
              <Button
                type="button"
                variant="danger"
                size="small"
                className="w-full justify-center sm:w-auto"
                onClick={onClearAll}
                icon={<span aria-hidden="true">🗑️</span>}
                aria-label={`Clear all ${downloadedCount} offline downloads`}
              >
                Clear ({downloadedCount})
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              size="small"
              className="w-full justify-center sm:w-auto"
              onClick={onSaveAllOffline}
              disabled={isSavingAllOffline || totalCount === 0 || allDownloaded}
              aria-label="Save all tracks for offline practice"
            >
              {isSavingAllOffline ? 'Saving...' : allDownloaded ? 'Saved Offline' : 'Save Offline'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="small"
              className="w-full justify-center sm:w-auto"
              onClick={onDownloadAllFiles}
              disabled={totalCount === 0}
              aria-label="Download all audio files to this device"
            >
              Download Files
            </Button>
          </div>
        </div>

        <p className="text-text-muted m-0 text-[11px] leading-relaxed">
          <strong>Save Offline</strong> keeps tracks available in this browser for practice without
          internet. <strong>Download Files</strong> saves the audio files to your device.
        </p>
      </div>

      <ul className="m-0 list-none p-2 px-3 pb-3 max-sm:p-2">
        {playlist.map((item, index) => {
          const activeKey = item.trackKey || 'tutti';
          const isFallback =
            selectedVoicePart && selectedVoicePart !== 'tutti' && activeKey === 'tutti';
          return (
            <li
              key={item.id}
              className={`hover:bg-primary-light mb-1 flex flex-col gap-3 rounded-lg border border-transparent p-3 px-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${index === currentIndex ? 'border-primary bg-primary-light text-primary font-semibold' : ''} max-sm:min-h-[56px] max-sm:gap-2 max-sm:p-2 max-sm:px-3`}
              onClick={() => onTrackSelect(index)}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center ${index === currentIndex ? 'text-primary' : 'text-text-muted'}`}
                >
                  <MusicIcon />
                </span>
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  <span className="truncate text-sm font-semibold">{item.name}</span>
                  {item.parentTitle && (
                    <span className="text-text-muted truncate text-xs font-medium opacity-85">
                      From: {item.parentTitle}
                    </span>
                  )}
                  {item.composer && (
                    <span className="text-text-muted truncate text-xs opacity-80">
                      {item.composer}
                    </span>
                  )}
                </div>
                {!item.isFolder && (
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-xs font-bold tracking-wide uppercase transition-colors ${isFallback ? 'bg-amber-50 text-amber-600' : 'bg-primary-light text-primary'} max-sm:px-1 max-sm:py-0.5 max-sm:text-[0.55rem]`}
                  >
                    {activeKey.toUpperCase()}
                  </span>
                )}
              </div>

              {!item.isFolder && (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    size="small"
                    variant={item.isDownloaded ? 'secondary' : 'outline'}
                    className="w-full justify-center sm:w-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.isDownloaded) {
                        onRemoveOffline(item);
                      } else {
                        onSaveTrackOffline(item);
                      }
                    }}
                    disabled={item.downloadStatus === 'downloading'}
                    aria-label={
                      item.isDownloaded
                        ? `Remove offline copy of ${item.name}`
                        : `Save ${item.name} for offline practice`
                    }
                  >
                    {item.downloadStatus === 'downloading'
                      ? `${downloadProgress[item.id] ?? 0}%`
                      : item.isDownloaded
                        ? 'Remove Offline Copy'
                        : 'Save Offline'}
                  </Button>

                  <Button
                    type="button"
                    size="small"
                    variant="outline"
                    className="w-full justify-center sm:w-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadTrackFile(item);
                    }}
                    disabled={!item.streamUrl}
                    aria-label={`Download ${item.name} audio file`}
                  >
                    Download File
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
