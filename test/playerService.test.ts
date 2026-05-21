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

    it('falls back to tutti when part is missing', () => {
      const result = playerService.applyVoicePartToFiles(initialFiles, 'tenor', mockPieces);
      
      assert.strictEqual(result[0].id, 'item1_tutti');
      assert.strictEqual(result[0].trackKey, 'tutti');
      assert.strictEqual(result[0].streamUrl, 'https://pb.com/api/files/musicLibrary/piece1/tutti.mp3');
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
  });
});
