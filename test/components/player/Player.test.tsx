// @vitest-environment jsdom
import { afterEach, it, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import { Player } from '../../../src/components/player/Player';
import * as useAudioPlaybackModule from '../../../src/hooks/useAudioPlayback';

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

const mockTrack = {
  id: 'track1',
  name: 'Awesome Song',
  parentTitle: 'Awesome Album',
  streamUrl: 'http://example.com/stream.mp3',
  isFolder: false,
  trackKey: 'soprano',
};

const defaultMockState = {
  loopMode: 'none' as const,
  currentTime: 15,
  duration: 305,
  volume: 0.8,
  audioRef: React.createRef<HTMLAudioElement>(),
  playError: null,
  delaySetting: 0,
  countdown: null,
  skipStart: 0,
  showSkipNotify: false,
  showHints: false,
  currentTrack: mockTrack,
  isDownloadNeeded: false,
  togglePlay: () => {},
  handleEnded: () => {},
  handleTimeUpdate: () => {},
  handleLoadedMetadata: () => {},
  handleSeekStart: () => {},
  handleSeekChange: () => {},
  handleSeekEnd: () => {},
  handleVolumeChange: () => {},
  handleSkipStartChange: () => {},
  toggleHints: () => {},
  setDelaySetting: () => {},
  setShowSkipNotify: () => {},
  handleAudioError: () => {},
  cycleLoopMode: () => {},
  getRepeatLabel: () => 'Repeat Off',
  handlePrev: () => {},
  handleNext: () => {},
  firstAudioIndex: 0,
};

describe('Player component', () => {
  it('renders progress and volume ranges with correct classes and accessibility attributes', () => {
    mock.method(useAudioPlaybackModule, 'useAudioPlayback', () => defaultMockState);

    render(
      <Player
        playlist={[mockTrack]}
        currentIndex={0}
        onTrackChange={() => {}}
        isPlaying={false}
        setIsPlaying={() => {}}
      />
    );

    // Track position range (always rendered)
    const progressRange = screen.getByLabelText('Track position');
    assert.ok(progressRange, 'progress range renders');
    assert.ok(
      progressRange.classList.contains('player-progress-range'),
      'has player-progress-range class'
    );

    // Volume range (rendered on desktop/non-coarse devices)
    const volumeRange = screen.getByLabelText('Volume');
    assert.ok(volumeRange, 'volume range renders');
    assert.ok(
      volumeRange.classList.contains('player-volume-range'),
      'has player-volume-range class'
    );
  });

  it('renders time labels below/near the track position control', () => {
    mock.method(useAudioPlaybackModule, 'useAudioPlayback', () => defaultMockState);

    render(
      <Player
        playlist={[mockTrack]}
        currentIndex={0}
        onTrackChange={() => {}}
        isPlaying={false}
        setIsPlaying={() => {}}
      />
    );

    // Current time and duration formatted correctly
    // 15 seconds -> "0:15"
    // 305 seconds -> "5:05"
    const currentTimeText = screen.getByText('0:15');
    const durationTimeText = screen.getByText('5:05');

    assert.ok(currentTimeText, 'renders current time label');
    assert.ok(durationTimeText, 'renders duration label');
  });

  it('renders skip input and gap select with correct attributes and labels', () => {
    mock.method(useAudioPlaybackModule, 'useAudioPlayback', () => ({
      ...defaultMockState,
      skipStart: 1.5,
      delaySetting: 2,
    }));

    render(
      <Player
        playlist={[mockTrack]}
        currentIndex={0}
        onTrackChange={() => {}}
        isPlaying={false}
        setIsPlaying={() => {}}
      />
    );

    // "Start track at" section
    const skipLabel = screen.getAllByText('Start track at')[0];
    assert.ok(skipLabel, 'Start track at label renders');

    const skipInput = screen.getByPlaceholderText('0') as HTMLInputElement;
    assert.ok(skipInput, 'skip input renders');
    assert.equal(skipInput.value, '1.5');
    assert.equal(skipInput.getAttribute('inputmode'), 'decimal');
    assert.ok(skipInput.classList.contains('w-24'), 'uses w-24 width for readability');

    // "Gap between tracks" section
    const gapLabel = screen.getAllByText('Gap between tracks')[0];
    assert.ok(gapLabel, 'Gap between tracks label renders');

    const gapSelect = screen.getByRole('combobox') as HTMLSelectElement;
    assert.ok(gapSelect, 'gap select renders');
    assert.equal(gapSelect.value, '2');

    // Verify select options
    const options = Array.from(gapSelect.options);
    assert.equal(options.length, 4);
    assert.equal(options[0].text, 'None');
    assert.equal(options[1].text, '2 seconds');
    assert.equal(options[2].text, '5 seconds');
    assert.equal(options[3].text, '10 seconds');
  });
});
