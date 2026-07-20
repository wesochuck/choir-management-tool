// @vitest-environment jsdom
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  getFileExtensionFromUrl,
  getSafeDownloadFilename,
  downloadRawFile,
  downloadRawFiles,
} from '../../src/lib/downloadFiles';
import type { PlayerMediaFile } from '../../src/services/playerService';

describe('downloadFiles utility helpers', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('getFileExtensionFromUrl', () => {
    it('extracts known extensions from pathnames', () => {
      assert.strictEqual(getFileExtensionFromUrl('https://example.com/file.mp3'), 'mp3');
      assert.strictEqual(getFileExtensionFromUrl('https://example.com/music/track.wav'), 'wav');
      assert.strictEqual(getFileExtensionFromUrl('https://example.com/stream.MP3'), 'mp3');
      assert.strictEqual(
        getFileExtensionFromUrl('https://example.com/test.m4a?param=value'),
        'm4a'
      );
      assert.strictEqual(getFileExtensionFromUrl('https://example.com/test.m4v'), 'm4v');
      assert.strictEqual(getFileExtensionFromUrl('https://example.com/test.gz'), 'gz');
      assert.strictEqual(getFileExtensionFromUrl('https://example.com/test.m3u8'), 'm3u8');
      assert.strictEqual(getFileExtensionFromUrl('https://example.com/file.name.tar.gz'), 'gz');
      assert.strictEqual(getFileExtensionFromUrl('https://example.com/test.mp4#t=10'), 'mp4');
    });

    it('defaults to mp3 when URL is malformed or extension is missing', () => {
      assert.strictEqual(getFileExtensionFromUrl('https://example.com/no-extension'), 'mp3');
      assert.strictEqual(getFileExtensionFromUrl('invalid-url-here'), 'mp3');
      assert.strictEqual(getFileExtensionFromUrl(''), 'mp3');
      assert.strictEqual(getFileExtensionFromUrl('https://example.com/test.c'), 'mp3');
      assert.strictEqual(getFileExtensionFromUrl('https://example.com/test.abcdef'), 'mp3');
      assert.strictEqual(getFileExtensionFromUrl('/relative/path/test.mp3'), 'mp3');
    });
  });

  describe('getSafeDownloadFilename', () => {
    it('sanitizes illegal filename characters and trims whitespace', () => {
      const track: PlayerMediaFile = {
        id: '1',
        name: 'Song: With <Illegal> \\ / * ? Characters',
        streamUrl: 'https://example.com/track.mp3',
        isFolder: false,
      };
      assert.strictEqual(getSafeDownloadFilename(track), 'Song With Illegal Characters.mp3');
    });

    it('filters out control characters', () => {
      const track: PlayerMediaFile = {
        id: '1a',
        name: 'Track\x00With\x1FControl\nChars',
        streamUrl: 'https://example.com/track.mp3',
        isFolder: false,
      };
      assert.strictEqual(getSafeDownloadFilename(track), 'TrackWithControlChars.mp3');
    });

    it('collapses multiple whitespace characters', () => {
      const track: PlayerMediaFile = {
        id: '2',
        name: 'Track   Name   With   Spaces',
        streamUrl: 'https://example.com/track.wav',
        isFolder: false,
      };
      assert.strictEqual(getSafeDownloadFilename(track), 'Track Name With Spaces.wav');
    });

    it('defaults missing or empty names to audio-track', () => {
      const track: PlayerMediaFile = {
        id: '3',
        name: '',
        streamUrl: 'https://example.com/file.mp3',
        isFolder: false,
      };
      assert.strictEqual(getSafeDownloadFilename(track), 'audio-track.mp3');

      const trackNoName: PlayerMediaFile = {
        id: '4',
        name: '  ',
        streamUrl: '',
        isFolder: false,
      };
      assert.strictEqual(getSafeDownloadFilename(trackNoName), 'audio-track.mp3');
    });
  });

  describe('downloadRawFile', () => {
    it('does not proceed and logs warning if track has no streamUrl', () => {
      const warnSpy = mock.method(console, 'warn', () => {});
      const track: PlayerMediaFile = {
        id: '1',
        name: 'Test File',
        streamUrl: '',
        isFolder: false,
      };

      downloadRawFile(track);
      assert.strictEqual(warnSpy.mock.callCount(), 1);
    });

    it('creates an anchor element with correct attributes and triggers click', () => {
      const mockClick = mock.fn();
      const mockAnchor = {
        href: '',
        download: '',
        rel: '',
        click: mockClick,
      };

      // Mock document.createElement to return our mock anchor
      mock.method(document, 'createElement', (tagName: string) => {
        if (tagName === 'a') {
          return mockAnchor as any;
        }
        return {};
      });

      const appendSpy = mock.method(document.body, 'appendChild', () => {});
      const removeSpy = mock.method(document.body, 'removeChild', () => {});

      const track: PlayerMediaFile = {
        id: '1',
        name: 'Practice Track',
        streamUrl: 'https://example.com/practicetrack.mp3',
        isFolder: false,
      };

      downloadRawFile(track);

      assert.strictEqual(mockAnchor.href, 'https://example.com/practicetrack.mp3');
      assert.strictEqual(mockAnchor.download, 'Practice Track.mp3');
      assert.strictEqual(mockAnchor.rel, 'noopener');
      assert.strictEqual(mockClick.mock.callCount(), 1);
      assert.strictEqual(appendSpy.mock.callCount(), 1);
      assert.strictEqual(removeSpy.mock.callCount(), 1);
    });
  });

  describe('downloadRawFiles', () => {
    it('sequentially calls downloadRawFile for all valid tracks', async () => {
      const mockAnchor = {
        href: '',
        download: '',
        rel: '',
        click: mock.fn(),
      };

      mock.method(document, 'createElement', () => mockAnchor as any);
      mock.method(document.body, 'appendChild', () => {});
      mock.method(document.body, 'removeChild', () => {});

      const tracks: PlayerMediaFile[] = [
        { id: '1', name: 'Track 1', streamUrl: 'https://ex.com/1.mp3', isFolder: false },
        { id: '2', name: 'Folder', streamUrl: '', isFolder: true },
        { id: '3', name: 'Track 3', streamUrl: 'https://ex.com/3.mp3', isFolder: false },
      ];

      const start = Date.now();
      await downloadRawFiles(tracks);
      const duration = Date.now() - start;

      assert.strictEqual(mockAnchor.click.mock.callCount(), 2);
      assert.ok(
        duration >= 250,
        `Should take at least 250ms due to sequential delay, took ${duration}ms`
      );
    });
  });
});
