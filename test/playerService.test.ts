/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { playerService, type PlayerMediaFile } from '../src/services/playerService';
import { pb } from '../src/lib/pocketbase';
import type { MusicPiece } from '../src/services/musicLibraryService';

describe('playerService', () => {
  let mockPieces: MusicPiece[];

  beforeEach(() => {
    mock.restoreAll();
    
    // Mock pb.files.getURL
    mock.method(pb.files, 'getURL', (piece: any, filename: string) => {
      return `https://pb.com/api/files/${piece.collectionName}/${piece.id}/${filename}`;
    });

    mockPieces = [
      {
        id: 'piece1',
        title: 'Song 1',
        collectionName: 'musicLibrary',
        audioTrackMapping: {
          tutti: 'tutti.mp3',
          soprano: 's.mp3',
          alto: 'a.mp3'
        }
      } as any,
      {
        id: 'piece2',
        title: 'Song 2',
        collectionName: 'musicLibrary',
        audioTrackMapping: {
          tutti: 'tutti2.mp3'
          // no parts
        }
      } as any,
      {
        id: 'movement1',
        parentId: 'parent1',
        title: 'Mvt 1',
        collectionName: 'musicLibrary',
        audioTrackMapping: {
          tutti: 'mvt1.mp3'
        }
      } as any
    ];
  });

  describe('applyVoicePartToFiles', () => {
    const initialFiles: PlayerMediaFile[] = [
      {
        id: 'item1_tutti',
        name: 'Song 1',
        pieceId: 'piece1',
        trackKey: 'tutti',
        availableTracks: {
          tutti: 'tutti.mp3',
          soprano: 's.mp3',
          alto: 'a.mp3'
        },
        streamUrl: '...',
        isFolder: false
      }
    ];

    it('maps to specific voice part when available', () => {
      const result = playerService.applyVoicePartToFiles(initialFiles, 'soprano', mockPieces);
      
      assert.strictEqual(result[0].id, 'item1_soprano');
      assert.strictEqual(result[0].trackKey, 'soprano');
      assert.strictEqual(result[0].streamUrl, 'https://pb.com/api/files/musicLibrary/piece1/s.mp3');
      assert.strictEqual(result[0].isDownloaded, false);
    });

    it('maps voice part case-insensitively', () => {
      const result = playerService.applyVoicePartToFiles(initialFiles, 'SOPRANO', mockPieces);
      
      assert.strictEqual(result[0].id, 'item1_soprano');
      assert.strictEqual(result[0].trackKey, 'soprano');
      assert.strictEqual(result[0].streamUrl, 'https://pb.com/api/files/musicLibrary/piece1/s.mp3');
    });

    it('falls back to tutti when part is missing', () => {
      const result = playerService.applyVoicePartToFiles(initialFiles, 'tenor', mockPieces);
      
      assert.strictEqual(result[0].id, 'item1_tutti');
      assert.strictEqual(result[0].trackKey, 'tutti');
      assert.strictEqual(result[0].streamUrl, 'https://pb.com/api/files/musicLibrary/piece1/tutti.mp3');
    });

    it('falls back to first track key when both requested part and tutti are missing', () => {
      const noTuttiFiles: PlayerMediaFile[] = [
        {
          id: 'item1_soprano',
          name: 'Song 1',
          pieceId: 'piece1',
          trackKey: 'soprano',
          availableTracks: {
            soprano: 's.mp3',
            alto: 'a.mp3'
          },
          streamUrl: '...',
          isFolder: false
        }
      ];
      const result = playerService.applyVoicePartToFiles(noTuttiFiles, 'tenor', mockPieces);
      
      assert.strictEqual(result[0].id, 'item1_soprano');
      assert.strictEqual(result[0].trackKey, 'soprano');
    });

    it('handles files without availableTracks or pieceId gracefully', () => {
      const folderFile: PlayerMediaFile = {
        id: 'folder1',
        name: 'Folder',
        isFolder: true,
        streamUrl: ''
      };
      const result = playerService.applyVoicePartToFiles([folderFile], 'soprano', mockPieces);
      assert.deepStrictEqual(result, [folderFile]);
    });

    it('updates track ID even if it had no suffix', () => {
      const noSuffixFile: PlayerMediaFile = {
        ...initialFiles[0],
        id: 'item1'
      };
      const result = playerService.applyVoicePartToFiles([noSuffixFile], 'alto', mockPieces);
      assert.strictEqual(result[0].id, 'item1_alto');
    });

    it('clears offline fields during mapping', () => {
      const offlineFile: PlayerMediaFile = {
        ...initialFiles[0],
        isDownloaded: true,
        offlineUrl: 'blob:...'
      };
      const result = playerService.applyVoicePartToFiles([offlineFile], 'soprano', mockPieces);
      assert.strictEqual(result[0].isDownloaded, false);
      assert.strictEqual(result[0].offlineUrl, undefined);
    });

    it('correctly maps various settings voice parts to case-sensitive track keys', () => {
      const mockSettingsVoiceParts = [
        { label: 'S1', sectionBucketId: 'S' },
        { label: 'S2', sectionBucketId: 'S' },
        { label: 'A1', sectionBucketId: 'A' }
      ];

      const files: PlayerMediaFile[] = [
        {
          id: 'item1_tutti',
          name: 'Song 1',
          pieceId: 'piece1',
          trackKey: 'tutti',
          availableTracks: {
            tutti: 'tutti.mp3',
            S1: 's1.mp3',
            S2: 's2.mp3'
          },
          streamUrl: '...',
          isFolder: false
        }
      ];

      // Test active matching for S1 (lowercase selector value)
      const s1Result = playerService.applyVoicePartToFiles(
        files,
        mockSettingsVoiceParts[0].label.toLowerCase(),
        mockPieces
      );
      assert.strictEqual(s1Result[0].trackKey, 'S1');
      assert.strictEqual(s1Result[0].id, 'item1_S1');

      // Test active matching for S2 (lowercase selector value)
      const s2Result = playerService.applyVoicePartToFiles(
        files,
        mockSettingsVoiceParts[1].label.toLowerCase(),
        mockPieces
      );
      assert.strictEqual(s2Result[0].trackKey, 'S2');
      assert.strictEqual(s2Result[0].id, 'item1_S2');

      // Test fallback for A1 (not in availableTracks, should fall back to tutti)
      const a1Result = playerService.applyVoicePartToFiles(
        files,
        mockSettingsVoiceParts[2].label.toLowerCase(),
        mockPieces
      );
      assert.strictEqual(a1Result[0].trackKey, 'tutti');
      assert.strictEqual(a1Result[0].id, 'item1_tutti');
    });
  });
});
