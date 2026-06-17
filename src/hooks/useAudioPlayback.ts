import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { PlayerMediaFile } from '../services/playerService';
import { safeLocalStorage } from '../lib/storage';

export type LoopMode = 'none' | 'all' | 'one';

export interface UseAudioPlaybackParams {
  playlist: PlayerMediaFile[];
  currentIndex: number;
  onTrackChange: (index: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  offlineMode?: boolean;
}

export function useAudioPlayback({
  playlist,
  currentIndex,
  onTrackChange,
  isPlaying,
  setIsPlaying,
  offlineMode = false,
}: UseAudioPlaybackParams) {
  const [loopMode, setLoopMode] = useState<LoopMode>('none');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [delaySetting, setDelaySetting] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [pendingNextIndex, setPendingNextIndex] = useState<number | null>(null);
  const [skipStart, setSkipStart] = useState<number>(0);
  const [showSkipNotify, setShowSkipNotify] = useState(false);
  const hasAppliedSkipRef = useRef<boolean>(false);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showHints, setShowHints] = useState<boolean>(() => {
    const saved = safeLocalStorage.getItem('show-playback-hints');
    if (saved !== null) return saved === 'true';
    return window.innerWidth > 600;
  });

  // Helper to clear countdown state
  const cancelCountdown = useCallback(() => {
    setCountdown(null);
    setPendingNextIndex(null);
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const currentTrack = playlist[currentIndex];
  const firstAudioIndex = useMemo(
    () =>
      Math.max(
        0,
        playlist.findIndex((t) => !t.isFolder)
      ),
    [playlist]
  );

  const isDownloadNeeded = offlineMode && currentTrack && !currentTrack.isDownloaded;

  useEffect(() => {
    if (isDownloadNeeded) {
      setPlayError(
        'This track is not downloaded for offline playback. Reconnect to the internet to play.'
      );
      setIsPlaying(false);
    } else {
      setPlayError(null);
    }
  }, [currentIndex, offlineMode, isDownloadNeeded, setIsPlaying]);

  useEffect(() => {
    cancelCountdown();
    if (!isDownloadNeeded) {
      setPlayError(null);
    }
    setCurrentTime(0);

    // Load skip setting for this specific track
    if (currentTrack?.id) {
      const saved = safeLocalStorage.getItem(`track_skip_${currentTrack.id}`);
      setSkipStart(saved ? parseFloat(saved) : 0);
      hasAppliedSkipRef.current = false;
    }
  }, [currentIndex, currentTrack?.id, cancelCountdown, isDownloadNeeded]);

  // The actual countdown timer effect
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0 && pendingNextIndex !== null) {
      // Countdown finished! Move to the next track.
      const nextIdx = pendingNextIndex;
      cancelCountdown();
      onTrackChange(nextIdx);
      setIsPlaying(true);
    }

    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [countdown, pendingNextIndex, onTrackChange, setIsPlaying, cancelCountdown]);

  const safePlay = useCallback(() => {
    if (isDownloadNeeded) return;
    if (audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name !== 'AbortError') {
            setPlayError('Could not play this track. It may be unsupported.');
            setIsPlaying(false);
          }
        });
      }
    }
  }, [isDownloadNeeded, setIsPlaying]);

  const togglePlay = useCallback(() => {
    if (isDownloadNeeded) return;
    // If waiting on a countdown, skip the wait and play next track immediately
    if (countdown !== null && pendingNextIndex !== null) {
      const nextIdx = pendingNextIndex;
      cancelCountdown();
      onTrackChange(nextIdx);
      setIsPlaying(true);
      return;
    }

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      safePlay();
      setIsPlaying(true);
    }
  }, [
    isDownloadNeeded,
    countdown,
    pendingNextIndex,
    isPlaying,
    cancelCountdown,
    onTrackChange,
    setIsPlaying,
    safePlay,
  ]);

  const handleEnded = useCallback(() => {
    let nextIndexToPlay: number | null = null;

    // Determine what the next track should be
    if (loopMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        safePlay();
      }
      return;
    } else if (currentIndex < playlist.length - 1) {
      nextIndexToPlay = currentIndex + 1;
    } else if (loopMode === 'all') {
      nextIndexToPlay = firstAudioIndex;
    }

    // Apply the delay or play immediately
    if (nextIndexToPlay !== null) {
      if (delaySetting > 0) {
        setPendingNextIndex(nextIndexToPlay);
        setCountdown(delaySetting);
        setIsPlaying(false); // Pause while waiting
      } else {
        onTrackChange(nextIndexToPlay);
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(false);
    }
  }, [
    loopMode,
    currentIndex,
    playlist.length,
    firstAudioIndex,
    delaySetting,
    onTrackChange,
    setIsPlaying,
    safePlay,
  ]);

  const cycleLoopMode = useCallback(() => {
    const modes: LoopMode[] = ['none', 'all', 'one'];
    const next = modes[(modes.indexOf(loopMode) + 1) % modes.length];
    setLoopMode(next);
  }, [loopMode]);

  const getRepeatLabel = useCallback(() => {
    switch (loopMode) {
      case 'one':
        return 'Repeat One';
      case 'all':
        return 'Repeat All';
      default:
        return 'No Repeat';
    }
  }, [loopMode]);

  const handlePrev = useCallback(() => {
    cancelCountdown();
    if (currentIndex > firstAudioIndex) {
      onTrackChange(currentIndex - 1);
    } else if (currentIndex === firstAudioIndex && loopMode === 'all') {
      onTrackChange(playlist.length - 1);
    }
  }, [currentIndex, firstAudioIndex, loopMode, playlist.length, onTrackChange, cancelCountdown]);

  const handleNext = useCallback(() => {
    cancelCountdown();
    if (currentIndex < playlist.length - 1) {
      onTrackChange(currentIndex + 1);
    } else if (loopMode === 'all') {
      // Wrap to the first audio file
      onTrackChange(firstAudioIndex);
    }
  }, [currentIndex, playlist.length, loopMode, firstAudioIndex, onTrackChange, cancelCountdown]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        safePlay();
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentIndex, isPlaying, safePlay]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.name,
        artist: currentTrack.composer || 'Choir Management',
      });

      navigator.mediaSession.setActionHandler('play', () => {
        safePlay();
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
    }
  }, [currentTrack, handlePrev, handleNext, setIsPlaying, safePlay]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current && !isScrubbing) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, [isScrubbing]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);

      // Automatically skip the first N seconds if configured
      if (!hasAppliedSkipRef.current && skipStart > 0 && audioRef.current.currentTime < skipStart) {
        audioRef.current.currentTime = Math.min(skipStart, audioRef.current.duration - 1);
        hasAppliedSkipRef.current = true;
        setShowSkipNotify(true);
        setTimeout(() => setShowSkipNotify(false), 3000);
      }
    }
  }, [skipStart]);

  const handleSeekStart = useCallback(() => {
    setIsScrubbing(true);
  }, []);

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  }, []);

  const handleSeekEnd = useCallback(
    (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
      const time = parseFloat((e.target as HTMLInputElement).value);
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
      setIsScrubbing(false);
    },
    []
  );

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  }, []);

  const handleSkipStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value) || 0;
      setSkipStart(val);
      const trackId = currentTrack?.id;
      if (trackId) {
        safeLocalStorage.setItem(`track_skip_${trackId}`, val.toString());
      }
    },
    [currentTrack?.id]
  );

  const toggleHints = useCallback(() => {
    const next = !showHints;
    setShowHints(next);
    safeLocalStorage.setItem('show-playback-hints', String(next));
  }, [showHints]);

  const handleAudioError = useCallback(() => {
    if (!isDownloadNeeded) {
      setPlayError('Could not load this track. It may be restricted or unsupported.');
      setIsPlaying(false);
    }
  }, [isDownloadNeeded, setIsPlaying]);

  return {
    loopMode,
    currentTime,
    duration,
    volume,
    audioRef,
    playError,
    delaySetting,
    countdown,
    skipStart,
    showSkipNotify,
    showHints,
    currentTrack,
    firstAudioIndex,
    isDownloadNeeded,
    togglePlay,
    handleEnded,
    cycleLoopMode,
    getRepeatLabel,
    handlePrev,
    handleNext,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleSeekStart,
    handleSeekChange,
    handleSeekEnd,
    handleVolumeChange,
    handleSkipStartChange,
    toggleHints,
    setDelaySetting,
    setShowSkipNotify,
    handleAudioError,
  };
}
