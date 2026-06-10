import React from 'react';
import type { PlayerMediaFile } from '../../services/playerService';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
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

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) return <div className="text-center py-12 px-4 text-text-muted text-base">No track selected</div>;

  // Voice part badge logic
  const activeKey = currentTrack.trackKey || 'tutti';
  const isFallback = selectedVoicePart && selectedVoicePart !== 'tutti' && activeKey === 'tutti';
  const badgeLabel = activeKey.toUpperCase();

  // Inline gradient fill for sliders (cross-browser filled-track)
  const seekPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const seekStyle = {
    background: `linear-gradient(to right, var(--accent-color) ${seekPct}%, var(--border-color) ${seekPct}%)`
  };
  const volPct = volume * 100;
  const volStyle = {
    background: `linear-gradient(to right, var(--accent-color) ${volPct}%, var(--border-color) ${volPct}%)`
  };

  const ctrlBtnBase = 'bg-primary-light border border-border text-text w-12 h-12 p-0 rounded-lg cursor-pointer transition-all flex items-center justify-center shadow-sm hover:bg-border hover:shadow-md hover:-translate-y-0.5 disabled:opacity-35 disabled:cursor-default active:opacity-35 max-sm:w-10 max-sm:h-10';

  return (
    <div className="bg-surface border border-border rounded-xl shadow-md p-6 mb-6 transition-all duration-300 max-sm:p-5 max-sm:px-4 max-sm:rounded-lg">
      <div className="flex flex-col">
        {currentTrack.parentTitle && (
          <span className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1 block">
            From: {currentTrack.parentTitle}
          </span>
        )}
        <div className="flex items-center gap-2 mb-5 min-w-0">
          <h2 className="text-xl font-bold m-0 text-text truncate flex-1 min-w-0 tracking-tight">{currentTrack.name}</h2>
          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase ${isFallback ? 'bg-amber-50 text-amber-600 border border-amber-300' : 'bg-primary-light text-primary border border-primary'}`}>
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
        
        {playError && <div className="bg-danger-bg border border-red-200 text-danger-text rounded-lg p-3 px-4 text-sm mb-4">{playError}</div>}
        
        {/* COUNTDOWN OVERLAY */}
        {countdown !== null && (
          <div className="flex items-center justify-center gap-3 p-3 px-4 mb-4 rounded-lg bg-primary-light border border-primary text-primary text-sm font-semibold animate-pulse">
            <span>Next track starting in {countdown}s...</span>
            <button 
              onClick={togglePlay} 
              className="px-3 py-1.5 rounded-lg border-none bg-primary text-surface text-xs font-semibold cursor-pointer uppercase tracking-wider transition-colors hover:bg-primary-deep"
            >
              Skip Wait
            </button>
          </div>
        )}

        {/* SKIP NOTIFICATION */}
        {showSkipNotify && (
          // @allow-inline-style - active part badge state
          <div className="flex items-center justify-center gap-3 p-3 px-4 mb-4 rounded-lg text-sm font-semibold" style={{ background: 'var(--hover-bg)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            <span>Skipped first {skipStart}s of track</span>
            {/* @allow-inline-style - inactive part badge state */}
            <button onClick={() => setShowSkipNotify(false)} className="px-3 py-1.5 rounded-lg border-none text-xs font-semibold cursor-pointer uppercase tracking-wider transition-colors" style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}>Dismiss</button>
          </div>
        )}

        <div className="flex items-center gap-4 mb-6 text-sm text-text-muted tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <input 
            type="range" 
            min="0" 
            max={duration || 0} 
            step="0.1"
            value={currentTime} 
            onMouseDown={handleSeekStart}
            onTouchStart={handleSeekStart}
            onChange={handleSeekChange} 
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            className="flex-1 h-1.5 appearance-none rounded-full outline-none cursor-pointer bg-border"
            style={seekStyle}
          />
          <span>{formatTime(duration)}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-6 w-full">
          <div className="min-w-0"></div>
          <div className="flex justify-center items-center gap-4">
            <button 
              onClick={handlePrev} 
              disabled={currentIndex === firstAudioIndex && loopMode !== 'all'}
              aria-label="Previous"
              className={ctrlBtnBase}
            >
              <SkipPreviousIcon />
            </button>
            <button 
              className="bg-text text-surface w-[72px] h-[72px] shadow-md border-none rounded-xl flex items-center justify-center hover:opacity-95 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-35 disabled:cursor-default transition-all max-sm:w-[60px] max-sm:h-[60px]"
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
            <button onClick={cycleLoopMode} className={`flex items-center gap-1.5 text-xs font-bold whitespace-nowrap uppercase tracking-wider rounded-full transition-all h-11 px-3.5 max-sm:w-10 max-sm:h-10 max-sm:p-0 max-sm:rounded-full max-sm:justify-center ${loopMode === 'all' || loopMode === 'one' ? 'bg-primary border-primary text-surface hover:bg-primary-deep hover:border-primary-deep' : 'bg-primary-light border border-border text-text-muted hover:bg-border hover:text-text'} max-sm:[&_span]:hidden`}>
              {loopMode === 'one' ? <RepeatOneIcon /> : <RepeatIcon />}
              <span>{getRepeatLabel()}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap py-4 border-t border-border mb-2 max-sm:flex-wrap max-sm:justify-between max-sm:items-center max-sm:gap-3">
          {/* START AT SETTING */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="skip-input" className="text-xs font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">Start At:</label>
            <input 
              id="skip-input"
              type="number" 
              min="0"
              step="0.1"
              value={skipStart || ''} 
              onChange={handleSkipStartChange}
              placeholder="0"
              className="w-14 px-2 py-1.5 rounded-lg border border-border bg-primary-light text-text text-sm font-semibold text-center tabular-nums outline-none focus:border-primary appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">s</span>
          </div>

          <div className="flex items-center gap-4 flex-1 min-w-[120px] max-sm:hidden touch:hidden">
            <label htmlFor="volume-input" className="text-xs font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">Volume</label>
            <input 
              id="volume-input"
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volume} 
              onChange={handleVolumeChange}
              className="flex-1 min-w-[80px] h-1 appearance-none rounded-full outline-none cursor-pointer bg-border"
              style={volStyle}
            />
          </div>
          
          {/* INTER-TRACK GAP SETTING */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="delay-select" className="text-xs font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">Gap:</label>
            <select 
              id="delay-select"
              value={delaySetting} 
              onChange={(e) => setDelaySetting(Number(e.target.value))}
              className="px-2 py-1.5 rounded-lg border border-border bg-primary-light text-text text-sm font-semibold cursor-pointer outline-none focus:border-primary"
            >
              <option value={0}>None</option>
              <option value={2}>2s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
            </select>
          </div>
        </div>

        <button 
          className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-transparent border border-border rounded-lg text-text-muted text-xs font-bold uppercase tracking-wider cursor-pointer transition-all hover:bg-primary-light hover:text-text"
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

        <div className={`grid grid-cols-3 gap-4 overflow-hidden transition-all duration-300 mt-0 max-sm:grid-cols-1 ${showHints ? 'max-h-[200px] opacity-100 mt-3 p-4 bg-primary-light rounded-lg border border-border' : 'max-h-0 opacity-0'}`}>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-text">Start At</span>
            <span className="text-xs text-text-muted leading-relaxed">Skips the intro for this specific track; saved for future sessions.</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-text">Gap</span>
            <span className="text-xs text-text-muted leading-relaxed">Adds a timed silence between consecutive songs.</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-text">Repeat</span>
            <span className="text-xs text-text-muted leading-relaxed">Controls if the playlist stops, loops, or restarts.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
