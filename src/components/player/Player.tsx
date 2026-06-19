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

  const handleSlSeekInput = React.useCallback(
    (e: unknown) => {
      if (!isScrubbingStartedRef.current) {
        handleSeekStart();
        isScrubbingStartedRef.current = true;
      }
      handleSeekChange({
        target: { value: String((e as CustomEvent).detail?.value ?? 0) },
      } as React.ChangeEvent<HTMLInputElement>);
    },
    [handleSeekStart, handleSeekChange]
  );

  const handleSlSeekChange = React.useCallback(
    (e: unknown) => {
      handleSeekEnd({
        target: { value: String((e as CustomEvent).detail?.value ?? 0) },
      } as unknown as React.MouseEvent<HTMLInputElement>);
      isScrubbingStartedRef.current = false;
    },
    [handleSeekEnd]
  );

  const handleSlVolumeInput = React.useCallback(
    (e: unknown) => {
      handleVolumeChange({
        target: { value: String((e as CustomEvent).detail?.value ?? 0) },
      } as React.ChangeEvent<HTMLInputElement>);
    },
    [handleVolumeChange]
  );

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentTrack)
    return (
      <div className="text-text-muted px-4 py-12 text-center text-base">No track selected</div>
    );

  // Voice part badge logic
  const activeKey = currentTrack.trackKey || 'tutti';
  const isFallback = selectedVoicePart && selectedVoicePart !== 'tutti' && activeKey === 'tutti';
  const badgeLabel = activeKey.toUpperCase();

  const ctrlBtnBase =
    'bg-primary-light border border-border text-text w-12 h-12 p-0 rounded-lg cursor-pointer transition-all flex items-center justify-center shadow-sm hover:bg-border hover:shadow-md hover:-translate-y-0.5 disabled:opacity-35 disabled:cursor-default active:opacity-35 max-sm:w-10 max-sm:h-10';

  return (
    <div className="border-border bg-surface mb-6 rounded-xl border p-6 shadow-md transition-all duration-300 max-sm:rounded-lg max-sm:p-5 max-sm:px-4">
      <div className="flex flex-col">
        {currentTrack.parentTitle && (
          <span className="text-text-muted mb-1 block text-xs font-bold tracking-wider uppercase">
            From: {currentTrack.parentTitle}
          </span>
        )}
        <div className="mb-5 flex min-w-0 items-center gap-2">
          <h2 className="text-text m-0 min-w-0 flex-1 truncate text-xl font-bold tracking-tight">
            {currentTrack.name}
          </h2>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-bold tracking-wide uppercase ${isFallback ? 'border border-amber-300 bg-amber-50 text-amber-600' : 'border-primary bg-primary-light text-primary border'}`}
          >
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

        {playError && (
          <div className="bg-danger-bg text-danger-text mb-4 rounded-lg border border-red-200 p-3 px-4 text-sm">
            {playError}
          </div>
        )}

        {/* COUNTDOWN OVERLAY */}
        {countdown !== null && (
          <div className="border-primary bg-primary-light text-primary mb-4 flex animate-pulse items-center justify-center gap-3 rounded-lg border p-3 px-4 text-sm font-semibold">
            <span>Next track starting in {countdown}s...</span>
            <button
              onClick={togglePlay}
              className="bg-primary text-surface hover:bg-primary-deep cursor-pointer rounded-lg border-none px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors"
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
            style={{
              background: 'var(--hover-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
            }}
          >
            <span>Skipped first {skipStart}s of track</span>
            <button
              onClick={() => setShowSkipNotify(false)}
              className="cursor-pointer rounded-lg border-none px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors"
              // @allow-inline-style - CSS variables for dynamic theme colors
              style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-2">
          <Range
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            aria-label="Track position"
            className="w-full touch-none"
            // @allow-inline-style - CSS custom properties for Shoelace range track colors
            style={
              {
                '--track-color-active': 'var(--accent-color)',
                '--track-color-inactive': 'var(--border-color)',
                '--track-height': '10px',
                '--thumb-size': '28px',
              } as React.CSSProperties
            }
            onInput={handleSlSeekInput}
            onChange={handleSlSeekChange}
          />

          <div className="text-text-muted flex justify-between text-sm tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="mb-6 flex flex-col items-center gap-3">
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
              className="bg-text text-surface flex size-[72px] items-center justify-center rounded-xl border-none shadow-md transition-all hover:-translate-y-0.5 hover:opacity-95 hover:shadow-lg disabled:cursor-default disabled:opacity-35 max-sm:size-[60px]"
              onClick={togglePlay}
              disabled={isDownloadNeeded}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <PauseIcon />
              ) : (
                <span className="ml-0.5 text-[28px] leading-none">
                  <PlayIcon />
                </span>
              )}
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

          <button
            onClick={cycleLoopMode}
            className={`border-border bg-primary-light text-text-muted hover:bg-border hover:text-text inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-xs font-bold tracking-wider uppercase transition-all ${
              loopMode === 'all' || loopMode === 'one'
                ? 'border-primary bg-primary-light text-primary'
                : ''
            }`}
          >
            {loopMode === 'one' ? <RepeatOneIcon /> : <RepeatIcon />}
            <span>{getRepeatLabel()}</span>
          </button>
        </div>

        <div className="border-border mb-2 flex flex-col gap-3 border-t py-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <label htmlFor="skip-input" className="text-overline text-text-muted mb-1 block">
              Start track at
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="skip-input"
                type="number"
                min="0"
                step="0.1"
                value={skipStart || ''}
                onChange={handleSkipStartChange}
                placeholder="0"
                inputMode="decimal"
                className="w-24 text-center"
              />
              <span className="text-text-muted text-sm font-semibold">seconds</span>
            </div>
            <p className="text-text-muted mt-1 mb-0 text-xs">
              Skips the beginning of this track every time you play it.
            </p>
          </div>

          <div className="flex min-w-[120px] flex-1 items-center gap-4 max-sm:hidden pointer-coarse:hidden">
            <label
              htmlFor="volume-input"
              className="text-overline text-text-muted whitespace-nowrap"
            >
              Volume
            </label>
            <Range
              id="volume-input"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              // @allow-inline-style - CSS custom properties for Shoelace range track colors
              style={
                {
                  '--track-color-active': 'var(--accent-color)',
                  '--track-color-inactive': 'var(--border-color)',
                  '--track-height': '4px',
                } as React.CSSProperties
              }
              onInput={handleSlVolumeInput}
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-3">
            <label htmlFor="delay-select" className="text-overline text-text-muted mb-1 block">
              Gap between tracks
            </label>
            <Select
              id="delay-select"
              value={delaySetting}
              onChange={(e) => setDelaySetting(Number(e.target.value))}
              className="w-full"
            >
              <option value={0}>None</option>
              <option value={2}>2 seconds</option>
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
            </Select>
          </div>
        </div>

        <button
          className="border-border text-text-muted hover:bg-primary-light hover:text-text inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-transparent py-2 text-xs font-bold tracking-wider uppercase transition-all"
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

        <div
          className={`mt-0 grid grid-cols-3 gap-4 overflow-hidden transition-all duration-300 max-sm:grid-cols-1 ${showHints ? 'border-border bg-primary-light mt-3 max-h-[200px] rounded-lg border p-4 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="flex flex-col gap-1">
            <span className="text-text text-xs font-bold tracking-wider uppercase">
              Start track at
            </span>
            <span className="text-text-muted text-xs leading-relaxed">
              Skips the beginning of this track every time you play it.
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-text text-xs font-bold tracking-wider uppercase">
              Gap between tracks
            </span>
            <span className="text-text-muted text-xs leading-relaxed">
              Adds silence before the next track starts.
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-text text-xs font-bold tracking-wider uppercase">Repeat</span>
            <span className="text-text-muted text-xs leading-relaxed">
              Choose whether to stop, loop the set list, or repeat one track.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
