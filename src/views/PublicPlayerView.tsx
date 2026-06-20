import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { playerService, type PlayerMediaFile } from '../services/playerService';
import { Player } from '../components/player/Player';
import { Playlist } from '../components/player/Playlist';
import { VoicePartSelector } from '../components/player/VoicePartSelector';
import {
  getOfflinePlaylist,
  downloadTrack,
  removeOfflineTrack,
  savePlaylistOffline,
  hydrateOfflineStatus,
  clearAllDownloads,
} from '../services/offlineMediaStore';
import { safeLocalStorage } from '../lib/storage';
import { queryKeys } from '../lib/queryKeys';
import { downloadRawFile, downloadRawFiles } from '../lib/downloadFiles';

export default function PublicPlayerView() {
  const [searchParams] = useSearchParams();
  let token = searchParams.get('token') || '';
  const sParam = searchParams.get('s');
  if (token && sParam && !token.includes('s=')) {
    token = `${token}&s=${sParam}`;
  }
  const eventId = searchParams.get('eventId') || '';

  const [playlist, setPlaylist] = useState<PlayerMediaFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedVoicePart, setSelectedVoicePart] = useState<string>(() => {
    return safeLocalStorage.getItem('player-voice-part') || 'tutti';
  });

  const [offlineSaveProgress, setOfflineSaveProgress] = useState<Record<string, number>>({});
  const [isSavingAllOffline, setIsSavingAllOffline] = useState(false);

  const hasTokenOrEventId = !!token || !!eventId;

  const playlistQuery = useQuery({
    queryKey: token
      ? queryKeys.playlist.byToken(token)
      : queryKeys.playlist.bySingerEventId(eventId),
    queryFn: async () => {
      if (token) {
        return playerService.fetchPlaylistByToken(token);
      } else {
        return playerService.fetchSingerPlaylistByEventId(eventId);
      }
    },
    enabled: hasTokenOrEventId,
  });

  useEffect(() => {
    if (!playlistQuery.data) return;
    const result = playlistQuery.data;
    const key = token || eventId;
    savePlaylistOffline(key, result.files);
    const initialPart = safeLocalStorage.getItem('player-voice-part') || 'tutti';
    const targetedTracks = playerService.applyVoicePartToFiles(
      result.files,
      initialPart,
      result.allPieces,
      result.voiceParts
    );
    hydrateOfflineStatus(targetedTracks).then(setPlaylist);
    setError(null);
  }, [playlistQuery.data, token, eventId]);

  useEffect(() => {
    if (!playlistQuery.isError) return;
    const key = token || eventId;
    getOfflinePlaylist(key).then((cached) => {
      if (cached) {
        const initialPart = safeLocalStorage.getItem('player-voice-part') || 'tutti';
        const targetedTracks = playerService.applyVoicePartToFiles(
          cached,
          initialPart,
          playlistQuery.data?.allPieces || [],
          playlistQuery.data?.voiceParts || []
        );
        hydrateOfflineStatus(targetedTracks).then(setPlaylist);
      } else {
        setError('Failed to load playlist. Please check your link.');
      }
    });
  }, [playlistQuery.isError, token, eventId, playlistQuery.data]);

  const handleVoicePartChange = async (part: string) => {
    setSelectedVoicePart(part);
    safeLocalStorage.setItem('player-voice-part', part);

    if (!playlistQuery.data) return;

    const updatedPlaylist = playerService.applyVoicePartToFiles(
      playlist,
      part,
      playlistQuery.data.allPieces,
      playlistQuery.data.voiceParts
    );
    const hydrated = await hydrateOfflineStatus(updatedPlaylist);
    setPlaylist(hydrated);
  };

  const handleSaveTrackOffline = async (track: PlayerMediaFile) => {
    try {
      setOfflineSaveProgress((prev) => ({ ...prev, [track.id]: 0 }));
      setPlaylist((prev) =>
        prev.map((f) => (f.id === track.id ? { ...f, downloadStatus: 'downloading' } : f))
      );

      await downloadTrack(track, (prog) => {
        setOfflineSaveProgress((prev) => ({ ...prev, [track.id]: prog }));
      });

      const hydrated = await hydrateOfflineStatus(playlist);
      setPlaylist(hydrated);
    } catch (err) {
      console.error('Offline save failed', err);
      setPlaylist((prev) =>
        prev.map((f) => (f.id === track.id ? { ...f, downloadStatus: 'error' } : f))
      );
    }
  };

  const handleRemoveOffline = async (track: PlayerMediaFile) => {
    await removeOfflineTrack(track.id);
    setPlaylist(await hydrateOfflineStatus(playlist));
  };

  const handleSaveAllOffline = async () => {
    if (isSavingAllOffline) return;
    const toSave = playlist.filter((f) => !f.isFolder && !f.isDownloaded);
    if (toSave.length === 0) return;
    setIsSavingAllOffline(true);

    const errorIds = new Set<string>();

    // @allow-sequential-await - downloads must be sequential to avoid overwhelming the server
    for (const track of toSave) {
      try {
        setOfflineSaveProgress((prev) => ({ ...prev, [track.id]: 0 }));
        setPlaylist((prev) =>
          prev.map((f) => (f.id === track.id ? { ...f, downloadStatus: 'downloading' } : f))
        );
        await downloadTrack(track, (prog) => {
          setOfflineSaveProgress((prev) => ({ ...prev, [track.id]: prog }));
        });
      } catch (err) {
        console.error('Offline save failed for', track.name, err);
        errorIds.add(track.id);
        setPlaylist((prev) =>
          prev.map((f) => (f.id === track.id ? { ...f, downloadStatus: 'error' } : f))
        );
      }
    }

    const hydrated = await hydrateOfflineStatus(playlist);
    const finalPlaylist = hydrated.map((f) =>
      errorIds.has(f.id) ? { ...f, downloadStatus: 'error' as const } : f
    );
    setPlaylist(finalPlaylist);
    setIsSavingAllOffline(false);
  };

  const handleClearAll = async () => {
    await clearAllDownloads();
    const hydrated = await hydrateOfflineStatus(playlist);
    setPlaylist(hydrated);
  };

  const handleDownloadTrackFile = (track: PlayerMediaFile) => {
    downloadRawFile(track);
  };

  const handleDownloadAllFiles = async () => {
    const tracksToDownload = playlist.filter((file) => !file.isFolder && file.streamUrl);
    if (tracksToDownload.length === 0) return;

    await downloadRawFiles(tracksToDownload);
  };

  if (!hasTokenOrEventId) {
    return (
      <div className="mx-auto mt-16 max-w-md p-4 text-center">
        <div className="border-danger-text bg-danger-bg text-danger-text rounded-lg border p-4 font-semibold shadow-sm">
          Missing player token or event ID.
        </div>
      </div>
    );
  }

  if (playlistQuery.isLoading) return <div className="pt-16 text-center">Loading playlist...</div>;
  if (error || playlistQuery.isError) {
    const errMsg =
      error || (playlistQuery.error instanceof Error ? playlistQuery.error.message : '');
    const isEventMode = !!eventId && !token;
    const friendlyMessage = isEventMode
      ? errMsg.includes('not_published') || errMsg.includes('empty_set_list')
        ? 'Practice tracks are not available yet. Please check back later or contact your director.'
        : errMsg.includes('not_on_roster')
          ? 'This practice set is not available for your account.'
          : 'Failed to load practice tracks. Please return to your dashboard or contact your director.'
      : 'Failed to load playlist. Please check your link or contact your director.';

    return (
      <div className="mx-auto mt-16 max-w-md p-4 text-center">
        <div className="border-danger-text bg-danger-bg text-danger-text rounded-lg border p-4 font-semibold shadow-sm">
          {friendlyMessage}
        </div>
        {isEventMode && (
          <div className="mt-4">
            <a
              href="/dashboard"
              className="text-primary hover:text-primary-deep inline-flex items-center gap-1 text-sm font-semibold hover:underline"
            >
              Back to Dashboard
            </a>
          </div>
        )}
      </div>
    );
  }
  if (!playlistQuery.data) return null;

  const showDashboardBackLink = Boolean(eventId && !token);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <div>
          {showDashboardBackLink && (
            <Link
              to="/"
              className="text-primary hover:text-primary-deep mb-4 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
            >
              ← Dashboard
            </Link>
          )}
          <h1 className="text-text text-3xl font-extrabold tracking-tight">Chorus</h1>
          <div className="text-muted text-sm">{playlistQuery.data.event.title}</div>
        </div>
      </header>

      <VoicePartSelector
        voiceParts={playlistQuery.data.voiceParts}
        selectedPart={selectedVoicePart}
        onSelect={handleVoicePartChange}
      />

      <Player
        playlist={playlist}
        currentIndex={currentIndex}
        onTrackChange={setCurrentIndex}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        selectedVoicePart={selectedVoicePart}
      />

      <Playlist
        playlist={playlist}
        currentIndex={currentIndex}
        onTrackSelect={(idx) => {
          setCurrentIndex(idx);
          setIsPlaying(true);
        }}
        onSaveTrackOffline={handleSaveTrackOffline}
        onRemoveOffline={handleRemoveOffline}
        onDownloadTrackFile={handleDownloadTrackFile}
        downloadProgress={offlineSaveProgress}
        selectedVoicePart={selectedVoicePart}
        onSaveAllOffline={handleSaveAllOffline}
        onDownloadAllFiles={handleDownloadAllFiles}
        onClearAll={handleClearAll}
        isSavingAllOffline={isSavingAllOffline}
      />

      <div className="text-text-muted mt-8 text-center text-xs">
        Save Offline keeps tracks available in this browser for practice without internet. Download
        Files saves the audio files to your device.
      </div>
    </div>
  );
}
