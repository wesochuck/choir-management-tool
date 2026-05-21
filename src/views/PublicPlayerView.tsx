import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { playerService, type PlayerPlaylist, type PlayerMediaFile } from '../services/playerService';
import { pb } from '../lib/pocketbase';
import { Player } from '../components/player/Player';
import { Playlist } from '../components/player/Playlist';
import { VoicePartSelector } from '../components/player/VoicePartSelector';
import { 
  getOfflinePlaylist, 
  downloadTrack, 
  removeOfflineTrack, 
  savePlaylistOffline,
  hydrateOfflineStatus
} from '../services/offlineMediaStore';
import { safeLocalStorage } from '../lib/storage';
import '../components/player/Player.css';

export default function PublicPlayerView() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
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
        // Cache offline by token
        await savePlaylistOffline(token, result.files);
      } else {
        result = await playerService.fetchPlaylistByEventId(eventId);
        // Cache offline by eventId
        await savePlaylistOffline(eventId, result.files);
      }

      setData(result);
      
      // Hydrate with offline status
      const hydrated = await hydrateOfflineStatus(result.files);
      setPlaylist(hydrated);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load playlist', err);
      // Try offline fallback
      const key = token || eventId;
      const cached = await getOfflinePlaylist(key);
      if (cached) {
        setPlaylist(await hydrateOfflineStatus(cached));
        setIsLoading(false);
      } else {
        setError('Failed to load playlist. Please check your link.');
        setIsLoading(false);
      }
    }
  }, [token, eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVoicePartChange = (part: string) => {
    setSelectedVoicePart(part);
    safeLocalStorage.setItem('player-voice-part', part);

    if (!data) return;
    const piecesMap = data.allPieces.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, (typeof data.allPieces)[number]>);

    setPlaylist(prev => prev.map(file => {
      if (!file.availableTracks || !file.pieceId) return file;

      const filename = file.availableTracks[part] || file.availableTracks['tutti'];
      if (!filename) return file;

      const piece = piecesMap[file.pieceId];
      if (!piece) return file;

      const trackKey = file.availableTracks[part] ? part : 'tutti';
      return {
        ...file,
        trackKey,
        streamUrl: pb.files.getURL(piece, filename),
      };
    }));
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
      />

      <div className="help-text" style={{ marginTop: '2rem' }}>
        You can download tracks for offline practice. They will be saved in your browser.
      </div>
    </div>
  );
}
