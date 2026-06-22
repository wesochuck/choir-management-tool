import { useState } from 'react';
import type { MusicPiece } from '../../../services/musicLibraryService';
import { getDefaultPlayableTrackKey } from '../../../lib/setList/setListItems';
import { pb } from '../../../lib/pocketbase';

export interface UseSetListAudioPlayerReturn {
  activeAudioUrl: string | null;
  activeAudioTitle: string;
  activeAudioPart: string;
  handlePlayRowTrack: (piece: MusicPiece) => void;
  clearAudio: () => void;
}

export function useSetListAudioPlayer(): UseSetListAudioPlayerReturn {
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [activeAudioTitle, setActiveAudioTitle] = useState('');
  const [activeAudioPart, setActiveAudioPart] = useState('');

  const handlePlayRowTrack = (piece: MusicPiece) => {
    const key = getDefaultPlayableTrackKey(piece);
    if (!key) return;

    const filename = piece.audioTrackMapping?.[key];
    if (!filename) return;

    setActiveAudioUrl(pb.files.getURL(piece, filename));
    setActiveAudioTitle(piece.title);
    setActiveAudioPart(key === 'tutti' ? 'Tutti' : key);
  };

  const clearAudio = () => setActiveAudioUrl(null);

  return {
    activeAudioUrl,
    activeAudioTitle,
    activeAudioPart,
    handlePlayRowTrack,
    clearAudio,
  };
}
