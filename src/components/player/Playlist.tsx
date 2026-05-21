import React from 'react';
import type { PlayerMediaFile } from '../../services/playerService';
import './Player.css';

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
        <span className="track-download-status downloading" onClick={stopPropagation} aria-label="Downloading">
          <svg className="progress-ring" width="20" height="20">
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
          <span className="progress-text" style={{ fontSize: '10px' }}>{progress}%</span>
        </span>
      );
    }

    if (item.isDownloaded) {
      return (
        <button
          className="track-download-btn downloaded"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveDownload(item);
          }}
          style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer' }}
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
          className="track-download-btn idle"
          onClick={(e) => {
            e.stopPropagation();
            onDownloadTrack(item);
          }}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
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
    <div className="playlist">
      <div className="playlist-header">
        <div className="playlist-meta">
          <span className="playlist-title">Set List</span>
          <span className="playlist-count">{totalCount} track{totalCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="playlist-actions">
          {downloadedCount > 0 && (
            <button
              className="playlist-action-btn clear-btn"
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
              className={`playlist-action-btn download-all-btn ${isDownloadingAll ? 'loading' : ''}`}
              onClick={onDownloadAll}
              disabled={isDownloadingAll}
              title="Download all tracks for offline playback"
              aria-label="Download all tracks"
            >
              {isDownloadingAll ? (
                <>
                  <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
      <ul>
        {playlist.map((item, index) => {
            const activeKey = item.trackKey || 'tutti';
            const isFallback = selectedVoicePart && selectedVoicePart !== 'tutti' && activeKey === 'tutti';
            return (
              <li 
                key={item.id} 
                className={`${index === currentIndex ? 'active' : ''}`}
                onClick={() => onTrackSelect(index)}
              >
                <span className="track-number">
                  <MusicIcon />
                </span>
                <div className="track-info" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                  <span className="track-name" style={{ fontWeight: 600 }}>{item.name}</span>
                  {item.parentTitle && (
                    <span className="track-parent-title">
                      From: {item.parentTitle}
                    </span>
                  )}
                  {item.composer && <span className="track-composer" style={{ fontSize: '0.75rem', opacity: 0.8 }}>{item.composer}</span>}
                </div>
                {!item.isFolder && (
                  <span className={`playlist-part-badge ${isFallback ? 'fallback' : 'matched'}`}>
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
