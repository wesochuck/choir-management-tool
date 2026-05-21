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
import './Player.css';

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

  if (!currentTrack) return <div className="player empty">No track selected</div>;

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

  return (
    <div className="player-card">
      <div className="player">
        {currentTrack.parentTitle && (
          <span className="track-parent-label">
            From: {currentTrack.parentTitle}
          </span>
        )}
        <div className="player-title-row">
          <h2>{currentTrack.name}</h2>
          <span className={`track-part-badge ${isFallback ? 'fallback' : 'matched'}`}>
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
        
        {playError && <div className="error-message" style={{ margin: '10px 0', padding: '10px', fontSize: '0.9rem' }}>{playError}</div>}
        
        {/* COUNTDOWN OVERLAY */}
        {countdown !== null && (
          <div className="countdown-indicator">
            <span>Next track starting in {countdown}s...</span>
            <button 
              onClick={togglePlay} 
              className="skip-wait-button"
            >
              Skip Wait
            </button>
          </div>
        )}

        {/* SKIP NOTIFICATION */}
        {showSkipNotify && (
          <div className="countdown-indicator" style={{ background: 'var(--hover-bg)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            <span>Skipped first {skipStart}s of track</span>
            <button onClick={() => setShowSkipNotify(false)} className="skip-wait-button" style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}>Dismiss</button>
          </div>
        )}

        <div className="progress-container">
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
            className="seek-bar"
            style={seekStyle}
          />
          <span>{formatTime(duration)}</span>
        </div>

        <div className="controls">
          <div className="controls-left"></div>
          <div className="controls-center">
            <button 
              onClick={handlePrev} 
              disabled={currentIndex === firstAudioIndex && loopMode !== 'all'}
              aria-label="Previous"
            >
              <SkipPreviousIcon />
            </button>
            <button 
              className="play-button"
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
            >
              <SkipNextIcon />
            </button>
          </div>
          <div className="controls-right">
            <button onClick={cycleLoopMode} className={`repeat-button ${loopMode}`}>
              {loopMode === 'one' ? <RepeatOneIcon /> : <RepeatIcon />}
              <span>{getRepeatLabel()}</span>
            </button>
          </div>
        </div>

        <div className="volume-container">
          {/* START AT SETTING */}
          <div className="skip-setting-container">
            <label htmlFor="skip-input" className="delay-label">Start At:</label>
            <input 
              id="skip-input"
              type="number" 
              min="0"
              step="0.1"
              value={skipStart || ''} 
              onChange={handleSkipStartChange}
              placeholder="0"
              style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            />
            <span className="unit-label">s</span>
          </div>

          <div className="volume-control">
            <label htmlFor="volume-input">Volume</label>
            <input 
              id="volume-input"
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volume} 
              onChange={handleVolumeChange}
              className="volume-bar"
              style={volStyle}
            />
          </div>
          
          {/* INTER-TRACK GAP SETTING */}
          <div className="delay-setting-container">
            <label htmlFor="delay-select" className="delay-label">Gap:</label>
            <select 
              id="delay-select"
              value={delaySetting} 
              onChange={(e) => setDelaySetting(Number(e.target.value))}
              className="delay-select"
            >
              <option value={0}>None</option>
              <option value={2}>2s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
            </select>
          </div>
        </div>

        <button 
          className="hints-toggle-btn"
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
            className={`chevron-icon ${showHints ? 'expanded' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span>{showHints ? 'Hide Control Guide' : 'Control Guide'}</span>
        </button>

        <div className={`playback-hints ${showHints ? 'expanded' : ''}`}>
          <div className="hint">
            <span className="hint-label">Start At</span>
            <span className="hint-text">Skips the intro for this specific track; saved for future sessions.</span>
          </div>
          <div className="hint">
            <span className="hint-label">Gap</span>
            <span className="hint-text">Adds a timed silence between consecutive songs.</span>
          </div>
          <div className="hint">
            <span className="hint-label">Repeat</span>
            <span className="hint-text">Controls if the playlist stops, loops, or restarts.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
