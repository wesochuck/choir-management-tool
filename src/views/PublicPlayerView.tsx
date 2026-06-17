import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  playerService,
  type PlayerPlaylist,
  type PlayerMediaFile,
} from '../services/playerService';
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

export default function PublicPlayerView() {
  const [searchParams] = useSearchParams();
  let token = searchParams.get('token') || '';
  const sParam = searchParams.get('s');
  if (token && sParam && !token.includes('s=')) {
    token = `${token}&s=${sParam}`;
  }
  const eventId = searchParams.get('eventId') || '';

  const [data, setData] = useState<PlayerPlaylist | null>(null);
  const [playlist, setPlaylist] = useState<PlayerMediaFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedVoicePart, setSelectedVoicePart] = useState<string>(() => {
    return safeLocalStorage.getItem('player-voice-part') || 'tutti';
  });

  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const hasTokenOrEventId = !!token || !!eventId;

  const playlistQuery = useQuery({
    queryKey: token ? queryKeys.playlist.byToken(token) : queryKeys.playlist.byEventId(eventId),
    queryFn: async () => {
      let result: PlayerPlaylist;
      if (token) {
        result = await playerService.fetchPlaylistByToken(token);
        await savePlaylistOffline(token, result.files);
      } else {
        result = await playerService.fetchPlaylistByEventId(eventId);
        await savePlaylistOffline(eventId, result.files);
      }
      return result;
    },
    enabled: hasTokenOrEventId,
  });

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!playlistQuery.data) return;
    const result = playlistQuery.data;
    setData(result);
    const initialPart = safeLocalStorage.getItem('player-voice-part') || 'tutti';
    const targetedTracks = playerService.applyVoicePartToFiles(
      result.files,
      initialPart,
      result.allPieces,
      result.voiceParts
    );
    hydrateOfflineStatus(targetedTracks).then(setPlaylist);
    setError(null);
  }, [playlistQuery.data]);

  useEffect(() => {
    if (!playlistQuery.isError) return;
    const key = token || eventId;
    getOfflinePlaylist(key).then((cached) => {
      if (cached) {
        const initialPart = safeLocalStorage.getItem('player-voice-part') || 'tutti';
        const targetedTracks = playerService.applyVoicePartToFiles(
          cached,
          initialPart,
          dataRef.current?.allPieces || [],
          dataRef.current?.voiceParts || []
        );
        hydrateOfflineStatus(targetedTracks).then(setPlaylist);
      } else {
        setError('Failed to load playlist. Please check your link.');
      }
    });
  }, [playlistQuery.isError, token, eventId]);

  const handleVoicePartChange = async (part: string) => {
    setSelectedVoicePart(part);
    safeLocalStorage.setItem('player-voice-part', part);

    if (!data) return;

    const updatedPlaylist = playerService.applyVoicePartToFiles(
      playlist,
      part,
      data.allPieces,
      data.voiceParts
    );
    const hydrated = await hydrateOfflineStatus(updatedPlaylist);
    setPlaylist(hydrated);
  };

  const handleDownload = async (track: PlayerMediaFile) => {
    try {
      setDownloadProgress((prev) => ({ ...prev, [track.id]: 0 }));
      setPlaylist((prev) =>
        prev.map((f) => (f.id === track.id ? { ...f, downloadStatus: 'downloading' } : f))
      );

      await downloadTrack(track, (prog) => {
        setDownloadProgress((prev) => ({ ...prev, [track.id]: prog }));
      });

      const hydrated = await hydrateOfflineStatus(playlist);
      setPlaylist(hydrated);
    } catch (err) {
      console.error('Download failed', err);
      setPlaylist((prev) =>
        prev.map((f) => (f.id === track.id ? { ...f, downloadStatus: 'error' } : f))
      );
    }
  };

  const handleRemoveDownload = async (track: PlayerMediaFile) => {
    await removeOfflineTrack(track.id);
    setPlaylist(await hydrateOfflineStatus(playlist));
  };

  const handleDownloadAll = async () => {
    if (isDownloadingAll) return;
    const toDownload = playlist.filter((f) => !f.isFolder && !f.isDownloaded);
    if (toDownload.length === 0) return;
    setIsDownloadingAll(true);

    const errorIds = new Set<string>();

    // @allow-sequential-await - downloads must be sequential to avoid overwhelming the server
    for (const track of toDownload) {
      try {
        setDownloadProgress((prev) => ({ ...prev, [track.id]: 0 }));
        setPlaylist((prev) =>
          prev.map((f) => (f.id === track.id ? { ...f, downloadStatus: 'downloading' } : f))
        );
        await downloadTrack(track, (prog) => {
          setDownloadProgress((prev) => ({ ...prev, [track.id]: prog }));
        });
      } catch (err) {
        console.error('Download failed for', track.name, err);
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
    setIsDownloadingAll(false);
  };

  const handleClearAll = async () => {
    await clearAllDownloads();
    const hydrated = await hydrateOfflineStatus(playlist);
    setPlaylist(hydrated);
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
  if (error) {
    return (
      <div className="mx-auto mt-16 max-w-md p-4 text-center">
        <div className="border-danger-text bg-danger-bg text-danger-text rounded-lg border p-4 font-semibold shadow-sm">
          {error}
        </div>
      </div>
    );
  }
  if (!data) return null;

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
          <div className="text-muted text-sm">{data.event.title}</div>
        </div>
      </header>

      <VoicePartSelector
        voiceParts={data.voiceParts}
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
        onDownloadTrack={handleDownload}
        onRemoveDownload={handleRemoveDownload}
        downloadProgressById={downloadProgress}
        selectedVoicePart={selectedVoicePart}
        onDownloadAll={handleDownloadAll}
        onClearAll={handleClearAll}
        isDownloadingAll={isDownloadingAll}
      />

      <div className="text-muted mt-8 text-center text-xs">
        You can download tracks for offline practice. They will be saved in your browser.
      </div>
    </div>
  );
}
