import React from 'react';
import type { PlayerMediaFile } from '../../services/playerService';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import { Input, Select, Range } from '../ui';

import {
  PlayIcon,
  PauseIcon,
  SkipNextIcon,
  SkipPreviousIcon,
  RepeatIcon,
  RepeatOneIcon,
} from './PlayerIcons';

interface PlayerProps {
  playlist: PlayerMediaFile[];
  currentIndex: number;
  onTrackChange: (index: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  offlineMode?: boolean;
  selectedVoicePart?: string;
}

export const Player: React.FC<PlayerProps> = ({ 
  playlist, 
  currentIndex, 
  onTrackChange,
  isPlaying,
  setIsPlaying,
  offlineMode = false,
  selectedVoicePart,
}) => {
  const {
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
    isDownloadNeeded,
    togglePlay,
    handleEnded,
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
    cycleLoopMode,
    getRepeatLabel,
    handlePrev,
    handleNext,
    firstAudioIndex,
  } = useAudioPlayback({
    playlist,
    currentIndex,
    onTrackChange,
    isPlaying,
    setIsPlaying,
    offlineMode,
  });

  // Track whether scrubbing has started so handleSeekStart fires only once
  const isScrubbingStartedRef = React.useRef(false);

  const handleSlSeekInput = React.useCallback((e: unknown) => {
    if (!isScrubbingStartedRef.current) {
      handleSeekStart();
      isScrubbingStartedRef.current = true;
    }
    handleSeekChange({ target: { value: String((e as CustomEvent).detail?.value ?? 0) } } as React.ChangeEvent<HTMLInputElement>);
  }, [handleSeekStart, handleSeekChange]);

  const handleSlSeekChange = React.useCallback((e: unknown) => {
    handleSeekEnd({ target: { value: String((e as CustomEvent).detail?.value ?? 0) } } as unknown as React.MouseEvent<HTMLInputElement>);
    isScrubbingStartedRef.current = false;
  }, [handleSeekEnd]);

  const handleSlVolumeInput = React.useCallback((e: unknown) => {
    handleVolumeChange({ target: { value: String((e as CustomEvent).detail?.value ?? 0) } } as React.ChangeEvent<HTMLInputElement>);
  }, [handleVolumeChange]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) return <div className="px-4 py-12 text-center text-base text-text-muted">No track selected</div>;

  // Voice part badge logic
  const activeKey = currentTrack.trackKey || 'tutti';
  const isFallback = selectedVoicePart && selectedVoicePart !== 'tutti' && activeKey === 'tutti';
  const badgeLabel = activeKey.toUpperCase();

  const ctrlBtnBase = 'bg-primary-light border border-border text-text w-12 h-12 p-0 rounded-lg cursor-pointer transition-all flex items-center justify-center shadow-sm hover:bg-border hover:shadow-md hover:-translate-y-0.5 disabled:opacity-35 disabled:cursor-default active:opacity-35 max-sm:w-10 max-sm:h-10';

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-6 shadow-md transition-all duration-300 max-sm:rounded-lg max-sm:p-5 max-sm:px-4">
      <div className="flex flex-col">
        {currentTrack.parentTitle && (
          <span className="mb-1 block text-xs font-bold tracking-wider text-text-muted uppercase">
            From: {currentTrack.parentTitle}
          </span>
        )}
        <div className="mb-5 flex min-w-0 items-center gap-2">
          <h2 className="m-0 min-w-0 flex-1 truncate text-xl font-bold tracking-tight text-text">{currentTrack.name}</h2>
          <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-bold tracking-wide uppercase ${isFallback ? 'border border-amber-300 bg-amber-50 text-amber-600' : 'border border-primary bg-primary-light text-primary'}`}>
            {badgeLabel}
          </span>
        </div>
        <audio 
          ref={audioRef} 
          src={currentTrack.offlineUrl || currentTrack.streamUrl} 
          preload="auto"
          autoPlay={isPlaying && !isDownloadNeeded}
          onEnded={handleEnded}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleAudioError}
        />
        
        {playError && <div className="mb-4 rounded-lg border border-red-200 bg-danger-bg p-3 px-4 text-sm text-danger-text">{playError}</div>}
        
        {/* COUNTDOWN OVERLAY */}
        {countdown !== null && (
          <div className="mb-4 flex animate-pulse items-center justify-center gap-3 rounded-lg border border-primary bg-primary-light p-3 px-4 text-sm font-semibold text-primary">
            <span>Next track starting in {countdown}s...</span>
            <button 
              onClick={togglePlay} 
              className="cursor-pointer rounded-lg border-none bg-primary px-3 py-1.5 text-xs font-semibold tracking-wider text-surface uppercase transition-colors hover:bg-primary-deep"
            >
              Skip Wait
            </button>
          </div>
        )}

        {/* SKIP NOTIFICATION */}
        {showSkipNotify && (
          <div
            className="mb-4 flex items-center justify-center gap-3 rounded-lg p-3 px-4 text-sm font-semibold"
            // @allow-inline-style - CSS variables for dynamic theme colors
            style={{ background: 'var(--hover-bg)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <span>Skipped first {skipStart}s of track</span>
            <button
              onClick={() => setShowSkipNotify(false)}
              className="cursor-pointer rounded-lg border-none px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors"
              // @allow-inline-style - CSS variables for dynamic theme colors
              style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}
            >Dismiss</button>
          </div>
        )}

        <div className="mb-6 flex items-center gap-4 text-sm text-text-muted tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <Range
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            // @allow-inline-style - CSS custom properties for Shoelace range track colors
            style={{ '--track-color-active': 'var(--accent-color)', '--track-color-inactive': 'var(--border-color)', '--track-height': '6px' } as React.CSSProperties}
            onInput={handleSlSeekInput}
            onChange={handleSlSeekChange}
          />
          <span>{formatTime(duration)}</span>
        </div>

        <div className="mb-6 grid w-full grid-cols-[1fr_auto_1fr] items-center">
          <div className="min-w-0"></div>
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={handlePrev} 
              disabled={currentIndex === firstAudioIndex && loopMode !== 'all'}
              aria-label="Previous"
              className={ctrlBtnBase}
            >
              <SkipPreviousIcon />
            </button>
            <button 
              className="flex size-[72px] items-center justify-center rounded-xl border-none bg-text text-surface shadow-md transition-all hover:-translate-y-0.5 hover:opacity-95 hover:shadow-lg disabled:cursor-default disabled:opacity-35 max-sm:size-[60px]"
              onClick={togglePlay}
              disabled={isDownloadNeeded}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button 
              onClick={handleNext} 
              disabled={currentIndex >= playlist.length - 1 && loopMode !== 'all'}
              aria-label="Next"
              className={ctrlBtnBase}
            >
              <SkipNextIcon />
            </button>
          </div>
          <div className="flex justify-end">
            <button onClick={cycleLoopMode} className={`flex h-11 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold tracking-wider whitespace-nowrap uppercase transition-all max-sm:size-10 max-sm:justify-center max-sm:rounded-full max-sm:p-0 ${loopMode === 'all' || loopMode === 'one' ? 'border-primary bg-primary text-surface hover:border-primary-deep hover:bg-primary-deep' : 'border border-border bg-primary-light text-text-muted hover:bg-border hover:text-text'} max-sm:[&_span]:hidden`}>
              {loopMode === 'one' ? <RepeatOneIcon /> : <RepeatIcon />}
              <span>{getRepeatLabel()}</span>
            </button>
          </div>
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-4 border-t border-border py-4 max-sm:flex-wrap max-sm:items-center max-sm:justify-between max-sm:gap-3">
          {/* START AT SETTING */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="skip-input" className="text-overline whitespace-nowrap text-text-muted">Start At:</label>
            <Input 
              id="skip-input"
              type="number" 
              min="0"
              step="0.1"
              value={skipStart || ''} 
              onChange={handleSkipStartChange}
              placeholder="0"
              className="w-14 appearance-none rounded-lg border border-border bg-primary-light px-2 py-1.5 text-center text-sm font-semibold text-text tabular-nums outline-none [-moz-appearance:textfield] focus:border-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-xs font-bold tracking-wider text-text-muted uppercase">s</span>
          </div>

          <div className="pointer-coarse:hidden flex min-w-[120px] flex-1 items-center gap-4 max-sm:hidden">
            <label htmlFor="volume-input" className="text-overline whitespace-nowrap text-text-muted">Volume</label>
            <Range
              id="volume-input"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              // @allow-inline-style - CSS custom properties for Shoelace range track colors
              style={{ '--track-color-active': 'var(--accent-color)', '--track-color-inactive': 'var(--border-color)', '--track-height': '4px' } as React.CSSProperties}
              onInput={handleSlVolumeInput}
            />
          </div>
          
          {/* INTER-TRACK GAP SETTING */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="delay-select" className="text-overline whitespace-nowrap text-text-muted">Gap:</label>
            <Select
              id="delay-select"
              value={delaySetting}
              onChange={(e) => setDelaySetting(Number(e.target.value))}
              className="w-auto"
            >
              <option value={0}>None</option>
              <option value={2}>2s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
            </Select>
          </div>
        </div>

        <button 
          className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-transparent py-2 text-xs font-bold tracking-wider text-text-muted uppercase transition-all hover:bg-primary-light hover:text-text"
          onClick={toggleHints}
          aria-expanded={showHints}
        >
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${showHints ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span>{showHints ? 'Hide Control Guide' : 'Control Guide'}</span>
        </button>

        <div className={`mt-0 grid grid-cols-3 gap-4 overflow-hidden transition-all duration-300 max-sm:grid-cols-1 ${showHints ? 'mt-3 max-h-[200px] rounded-lg border border-border bg-primary-light p-4 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider text-text uppercase">Start At</span>
            <span className="text-xs leading-relaxed text-text-muted">Skips the intro for this specific track; saved for future sessions.</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider text-text uppercase">Gap</span>
            <span className="text-xs leading-relaxed text-text-muted">Adds a timed silence between consecutive songs.</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider text-text uppercase">Repeat</span>
            <span className="text-xs leading-relaxed text-text-muted">Controls if the playlist stops, loops, or restarts.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
