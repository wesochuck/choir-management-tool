import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { playerService, type PlayerPlaylist, type PlayerMediaFile } from '../services/playerService';
import { Player } from '../components/player/Player';
import { Playlist } from '../components/player/Playlist';
import { VoicePartSelector } from '../components/player/VoicePartSelector';
import { 
  getOfflinePlaylist, 
  downloadTrack, 
  removeOfflineTrack, 
  savePlaylistOffline,
  hydrateOfflineStatus,
  clearAllDownloads
} from '../services/offlineMediaStore';
import { safeLocalStorage } from '../lib/storage';
import '../components/player/Player.css';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedVoicePart, setSelectedVoicePart] = useState<string>(() => {
    return safeLocalStorage.getItem('player-voice-part') || 'tutti';
  });

  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const loadData = useCallback(async () => {
    if (!token && !eventId) {
      setError('Missing player token or event ID.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      let result: PlayerPlaylist;
      
      if (token) {
        result = await playerService.fetchPlaylistByToken(token);
        await savePlaylistOffline(token, result.files);
      } else {
        result = await playerService.fetchPlaylistByEventId(eventId);
        await savePlaylistOffline(eventId, result.files);
      }

      setData(result);
      
      // Read directly from storage to avoid dependency triggers
      const initialPart = safeLocalStorage.getItem('player-voice-part') || 'tutti';
      const targetedTracks = playerService.applyVoicePartToFiles(result.files, initialPart, result.allPieces);
      const hydrated = await hydrateOfflineStatus(targetedTracks);
      
      setPlaylist(hydrated);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load playlist', err);
      const key = token || eventId;
      const cached = await getOfflinePlaylist(key);
      if (cached) {
        const initialPart = safeLocalStorage.getItem('player-voice-part') || 'tutti';
        const targetedTracks = playerService.applyVoicePartToFiles(cached, initialPart, data?.allPieces || []); 
        setPlaylist(await hydrateOfflineStatus(targetedTracks));
        setIsLoading(false);
      } else {
        setError('Failed to load playlist. Please check your link.');
        setIsLoading(false);
      }
    }
  }, [token, eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVoicePartChange = async (part: string) => {
    setSelectedVoicePart(part);
    safeLocalStorage.setItem('player-voice-part', part);

    if (!data) return;
    
    // Remap current tracks using the new part selection
    const updatedPlaylist = playerService.applyVoicePartToFiles(playlist, part, data.allPieces);
    const hydrated = await hydrateOfflineStatus(updatedPlaylist);
    setPlaylist(hydrated);
  };

  const handleDownload = async (track: PlayerMediaFile) => {
    try {
      setDownloadProgress(prev => ({ ...prev, [track.id]: 0 }));
      setPlaylist(prev => prev.map(f => f.id === track.id ? { ...f, downloadStatus: 'downloading' } : f));

      await downloadTrack(track, (prog) => {
        setDownloadProgress(prev => ({ ...prev, [track.id]: prog }));
      });

      const hydrated = await hydrateOfflineStatus(playlist);
      setPlaylist(hydrated);
    } catch (err) {
      console.error('Download failed', err);
      setPlaylist(prev => prev.map(f => f.id === track.id ? { ...f, downloadStatus: 'error' } : f));
    }
  };

  const handleRemoveDownload = async (track: PlayerMediaFile) => {
    await removeOfflineTrack(track.id);
    setPlaylist(await hydrateOfflineStatus(playlist));
  };

  const handleDownloadAll = async () => {
    if (isDownloadingAll) return;
    const toDownload = playlist.filter(f => !f.isFolder && !f.isDownloaded);
    if (toDownload.length === 0) return;
    setIsDownloadingAll(true);
    
    const errorIds = new Set<string>();
    
    for (const track of toDownload) {
      try {
        setDownloadProgress(prev => ({ ...prev, [track.id]: 0 }));
        setPlaylist(prev => prev.map(f => f.id === track.id ? { ...f, downloadStatus: 'downloading' } : f));
        await downloadTrack(track, (prog) => {
          setDownloadProgress(prev => ({ ...prev, [track.id]: prog }));
        });
      } catch (err) {
        console.error('Download failed for', track.name, err);
        errorIds.add(track.id);
        setPlaylist(prev => prev.map(f => f.id === track.id ? { ...f, downloadStatus: 'error' } : f));
      }
    }
    
    const hydrated = await hydrateOfflineStatus(playlist);
    const finalPlaylist = hydrated.map(f => errorIds.has(f.id) ? { ...f, downloadStatus: 'error' as const } : f);
    setPlaylist(finalPlaylist);
    setIsDownloadingAll(false);
  };

  const handleClearAll = async () => {
    await clearAllDownloads();
    const hydrated = await hydrateOfflineStatus(playlist);
    setPlaylist(hydrated);
  };

  if (isLoading) return <div className="chorus-player" style={{ textAlign: 'center', paddingTop: '4rem' }}>Loading playlist...</div>;
  if (error) return <div className="chorus-player"><div className="error-message">{error}</div></div>;
  if (!data) return null;

  return (
    <div className="chorus-player">
      <header>
        <div>
          <h1>Chorus</h1>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{data.event.title}</div>
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

      <div className="help-text" style={{ marginTop: '2rem' }}>
        You can download tracks for offline practice. They will be saved in your browser.
      </div>
    </div>
  );
}
