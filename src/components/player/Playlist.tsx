import React from 'react';
import type { PlayerMediaFile } from '../../services/playerService';

const MusicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>
);

interface PlaylistProps {
  playlist: PlayerMediaFile[];
  currentIndex: number;
  onTrackSelect: (index: number) => void;
  onDownloadTrack: (track: PlayerMediaFile) => void;
  onRemoveDownload: (track: PlayerMediaFile) => void;
  downloadProgressById: Record<string, number>;
  selectedVoicePart?: string;
  onDownloadAll: () => void;
  onClearAll: () => void;
  isDownloadingAll: boolean;
}

export const Playlist: React.FC<PlaylistProps> = ({ 
  playlist, 
  currentIndex, 
  onTrackSelect,
  onDownloadTrack,
  onRemoveDownload,
  downloadProgressById,
  selectedVoicePart,
  onDownloadAll,
  onClearAll,
  isDownloadingAll,
}) => {
  if (playlist.length === 0) return null;

  const renderDownloadStatus = (item: PlayerMediaFile) => {
    if (item.isFolder) return null;

    const status = item.downloadStatus || 'idle';
    const progress = downloadProgressById[item.id] || 0;

    const stopPropagation = (e: React.MouseEvent) => {
      e.stopPropagation();
    };

    if (status === 'downloading') {
      return (
        <span className="flex shrink-0 items-center gap-1" onClick={stopPropagation} aria-label="Downloading">
          <svg className="-rotate-90" width="20" height="20">
            <circle
              className="progress-ring__circle-bg"
              stroke="var(--border-color)"
              strokeWidth="2"
              fill="transparent"
              r="8"
              cx="10"
              cy="10"
            />
            <circle
              className="progress-ring__circle"
              stroke="var(--accent-color)"
              strokeWidth="2"
              fill="transparent"
              r="8"
              cx="10"
              cy="10"
              strokeDasharray={`${2 * Math.PI * 8}`}
              strokeDashoffset={`${2 * Math.PI * 8 * (1 - progress / 100)}`}
            />
          </svg>
          <span className="text-[10px] text-text-muted tabular-nums">{progress}%</span>
        </span>
      );
    }

    if (item.isDownloaded) {
      return (
        <button
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-primary transition-all hover:bg-primary-light hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveDownload(item);
          }}
          title="Remove offline copy"
          aria-label="Remove download"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      );
    }

    if (navigator.onLine) {
      return (
        <button
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-text-muted transition-all hover:bg-primary-light hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onDownloadTrack(item);
          }}
          title="Download for offline playback"
          aria-label="Download track"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      );
    }

    return null;
  };

  const audioTracks = playlist.filter(f => !f.isFolder);
  const downloadedCount = audioTracks.filter(f => f.isDownloaded).length;
  const totalCount = audioTracks.length;
  const allDownloaded = downloadedCount === totalCount && totalCount > 0;

  return (
    <div className="relative mt-6 max-h-[500px] overflow-y-auto rounded-xl border border-border bg-surface shadow-md max-sm:max-h-none max-sm:overflow-y-visible max-sm:rounded-lg">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-4 max-[480px]:flex-col max-[480px]:items-stretch">
        <div className="flex min-w-0 items-baseline gap-2 max-[480px]:justify-between">
          <span className="text-base font-bold whitespace-nowrap text-text">Set List</span>
          <span className="text-xs text-text-muted tabular-nums">{totalCount} track{totalCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 max-[480px]:grid max-[480px]:w-full max-[480px]:grid-cols-2">
          {downloadedCount > 0 && (
            <button
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-primary-light px-3 py-1.5 text-xs font-bold tracking-wider whitespace-nowrap text-text-muted uppercase transition-all hover:border-danger-text hover:bg-danger-bg hover:text-danger-text disabled:cursor-default disabled:opacity-60 max-[480px]:w-full max-[480px]:justify-center"
              onClick={onClearAll}
              title="Remove all offline downloads"
              aria-label="Clear all downloads"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
              </svg>
              Clear ({downloadedCount})
            </button>
          )}
          {!allDownloaded && (
            <button
              className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold tracking-wider whitespace-nowrap uppercase transition-all disabled:cursor-default disabled:opacity-60 ${isDownloadingAll ? 'border-primary bg-primary-light text-primary' : 'border-primary bg-primary-light text-primary hover:bg-primary hover:text-surface'} max-[480px]:w-full max-[480px]:justify-center`}
              onClick={onDownloadAll}
              disabled={isDownloadingAll}
              title="Download all tracks for offline playback"
              aria-label="Download all tracks"
            >
              {isDownloadingAll ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Downloading…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download All
                </>
              )}
            </button>
          )}
        </div>
      </div>
      <ul className="m-0 list-none p-2 px-3 pb-3 max-sm:p-2">
        {playlist.map((item, index) => {
            const activeKey = item.trackKey || 'tutti';
            const isFallback = selectedVoicePart && selectedVoicePart !== 'tutti' && activeKey === 'tutti';
            return (
              <li 
                key={item.id} 
                className={`mb-1 flex cursor-pointer items-center gap-3 rounded-lg border border-transparent p-3 px-4 transition-colors hover:bg-primary-light ${index === currentIndex ? 'border-primary bg-primary-light font-semibold text-primary' : ''} max-sm:min-h-[56px] max-sm:gap-2 max-sm:p-2 max-sm:px-3`}
                onClick={() => onTrackSelect(index)}
              >
                <span className={`flex size-7 shrink-0 items-center justify-center ${index === currentIndex ? 'text-primary' : 'text-text-muted'}`}>
                  <MusicIcon />
                </span>
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  <span className="truncate text-sm font-semibold">{item.name}</span>
                  {item.parentTitle && (
                    <span className="truncate text-xs font-medium text-text-muted opacity-85">
                      From: {item.parentTitle}
                    </span>
                  )}
                  {item.composer && <span className="truncate text-xs text-text-muted opacity-80">{item.composer}</span>}
                </div>
                {!item.isFolder && (
                  <span className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-xs font-bold tracking-wide uppercase transition-colors ${isFallback ? 'bg-amber-50 text-amber-600' : 'bg-primary-light text-primary'} max-sm:px-1 max-sm:py-0.5 max-sm:text-[0.55rem]`}>
                    {activeKey.toUpperCase()}
                  </span>
                )}
                {renderDownloadStatus(item)}
              </li>
            );
          })}
      </ul>
    </div>
  );
};
