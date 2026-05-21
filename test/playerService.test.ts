/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { playerService, type PlayerMediaFile } from '../src/services/playerService';
import { pb } from '../src/lib/pocketbase';
import type { MusicPiece } from '../src/services/musicLibraryService';
import { createMusicPieceFixture } from './helpers.ts';

describe('playerService', () => {
  let mockPieces: MusicPiece[];

  beforeEach(() => {
    mock.restoreAll();
    
    // Mock pb.files.getURL
    mock.method(pb.files, 'getURL', (piece: any, filename: string) => {
      return `https://pb.com/api/files/${piece.collectionName}/${piece.id}/${filename}`;
    });

    mockPieces = [
      createMusicPieceFixture({
        id: 'piece1',
        title: 'Song 1',
        audioTrackMapping: {
          tutti: 'tutti.mp3',
          soprano: 's.mp3',
          alto: 'a.mp3'
        }
      }),
      createMusicPieceFixture({
        id: 'piece2',
        title: 'Song 2',
        audioTrackMapping: {
          tutti: 'tutti2.mp3'
          // no parts
        }
      }),
      createMusicPieceFixture({
        id: 'movement1',
        parentId: 'parent1',
        title: 'Mvt 1',
        audioTrackMapping: {
          tutti: 'mvt1.mp3'
        }
      })
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

    it('falls back to other voice part in same bucket when requested part is missing', () => {
      const files: PlayerMediaFile[] = [
        {
          id: 'item1_tutti',
          name: 'Song 1',
          pieceId: 'piece1',
          trackKey: 'tutti',
          availableTracks: {
            tutti: 'tutti.mp3',
            S1: 's1.mp3'
          },
          streamUrl: '...',
          isFolder: false
        }
      ];

      const result = playerService.applyVoicePartToFiles(files, 'S2', mockPieces);
      assert.strictEqual(result[0].trackKey, 'S1');
      assert.strictEqual(result[0].id, 'item1_S1');
    });

    it('falls back to section bucket track when requested part is missing', () => {
      const files: PlayerMediaFile[] = [
        {
          id: 'item1_tutti',
          name: 'Song 1',
          pieceId: 'piece1',
          trackKey: 'tutti',
          availableTracks: {
            tutti: 'tutti.mp3',
            S: 's.mp3'
          },
          streamUrl: '...',
          isFolder: false
        }
      ];

      const result = playerService.applyVoicePartToFiles(files, 'S2', mockPieces);
      assert.strictEqual(result[0].trackKey, 'S');
      assert.strictEqual(result[0].id, 'item1_S');
    });

    it('falls back to other voice part in same bucket when using custom settings', () => {
      const customVoiceParts = [
        { label: 'HighSop', fullName: 'High Soprano', sectionCode: 'HighSopSection' },
        { label: 'LowSop', fullName: 'Low Soprano', sectionCode: 'HighSopSection' }
      ];

      const files: PlayerMediaFile[] = [
        {
          id: 'item1_tutti',
          name: 'Song 1',
          pieceId: 'piece1',
          trackKey: 'tutti',
          availableTracks: {
            tutti: 'tutti.mp3',
            HighSop: 'high_sop.mp3'
          },
          streamUrl: '...',
          isFolder: false
        }
      ];

      const result = playerService.applyVoicePartToFiles(files, 'LowSop', mockPieces, customVoiceParts);
      assert.strictEqual(result[0].trackKey, 'HighSop');
      assert.strictEqual(result[0].id, 'item1_HighSop');
    });
  });

  describe('fetchPlaylistByToken', () => {
    let originalSend: typeof pb.send;

    beforeEach(() => {
      originalSend = pb.send;
    });

    afterEach(() => {
      pb.send = originalSend;
    });

    it('defensively parses stringified setList, voiceParts, and audioTrackMapping', async () => {
      pb.send = (async <T>(path: string, options?: any): Promise<T> => {
        assert.strictEqual(path, '/api/player-playlist');
        assert.strictEqual(options?.query?.token, 'some-token');
        return {
          event: { id: 'evt1', title: 'Concert', date: '2026-05-21' },
          setList: JSON.stringify([
            { id: 'item1', type: 'piece', pieceId: 'piece1', title: 'Song 1' }
          ]),
          voiceParts: JSON.stringify([
            { label: 'Soprano', sectionBucketId: 'S' }
          ]),
          pieces: JSON.stringify([
            {
              id: 'piece1',
              title: 'Song 1',
              audioTrackMapping: JSON.stringify({ tutti: 'tutti.mp3' }),
              collectionName: 'musicLibrary'
            }
          ])
        } as unknown as T;
      }) as typeof pb.send;

      const result = await playerService.fetchPlaylistByToken('some-token');

      assert.strictEqual(result.event.id, 'evt1');
      assert.strictEqual(result.event.title, 'Concert');
      assert.strictEqual(result.voiceParts.length, 1);
      assert.strictEqual(result.voiceParts[0].label, 'Soprano');
      assert.strictEqual(result.files.length, 1);
      assert.strictEqual(result.files[0].name, 'Song 1');
      assert.strictEqual(result.files[0].trackKey, 'tutti');
      assert.strictEqual(result.files[0].availableTracks?.tutti, 'tutti.mp3');
    });

    it('works correctly with standard object/array payloads', async () => {
      pb.send = (async <T>(): Promise<T> => {
        return {
          event: { id: 'evt1', title: 'Concert', date: '2026-05-21' },
          setList: [
            { id: 'item1', type: 'piece', pieceId: 'piece1', title: 'Song 1' }
          ],
          voiceParts: [
            { label: 'Soprano', sectionBucketId: 'S' }
          ],
          pieces: [
            {
              id: 'piece1',
              title: 'Song 1',
              audioTrackMapping: { tutti: 'tutti.mp3' },
              collectionName: 'musicLibrary'
            }
          ]
        } as unknown as T;
      }) as typeof pb.send;

      const result = await playerService.fetchPlaylistByToken('some-token');

      assert.strictEqual(result.event.id, 'evt1');
      assert.strictEqual(result.voiceParts.length, 1);
      assert.strictEqual(result.files.length, 1);
      assert.strictEqual(result.files[0].name, 'Song 1');
    });

    it('falls back to matching by set list title when pieceId is missing', async () => {
      pb.send = (async <T>(): Promise<T> => {
        return {
          event: { id: 'evt1', title: 'Concert', date: '2026-05-21' },
          setList: [
            { id: 'item1', type: 'song', pieceId: '', title: 'Four Freedoms 𝄞' }
          ],
          voiceParts: [],
          pieces: [
            {
              id: 'parent1',
              title: 'Four Freedoms',
              audioTrackMapping: {},
              collectionName: 'musicLibrary'
            },
            {
              id: 'movement1',
              parentId: 'parent1',
              title: 'Movement 1',
              audioTrackMapping: { tutti: 'mvt1.mp3' },
              collectionName: 'musicLibrary'
            }
          ]
        } as unknown as T;
      }) as typeof pb.send;

      const result = await playerService.fetchPlaylistByToken('some-token');
      assert.strictEqual(result.files.length, 1);
      assert.strictEqual(result.files[0].pieceId, 'movement1');
      assert.strictEqual(result.files[0].trackKey, 'tutti');
    });

    it('falls back to matching by set list title when pieceId points to deleted piece', async () => {
      pb.send = (async <T>(): Promise<T> => {
        return {
          event: { id: 'evt1', title: 'Concert', date: '2026-05-21' },
          setList: [
            { id: 'item1', type: 'song', pieceId: 'missing-piece-id', title: 'Four Freedoms' }
          ],
          voiceParts: [],
          pieces: [
            {
              id: 'parent1',
              title: 'Four Freedoms',
              audioTrackMapping: {},
              collectionName: 'musicLibrary'
            },
            {
              id: 'movement1',
              parentId: 'parent1',
              title: 'Movement 1',
              audioTrackMapping: { tutti: 'mvt1.mp3' },
              collectionName: 'musicLibrary'
            }
          ]
        } as unknown as T;
      }) as typeof pb.send;

      const result = await playerService.fetchPlaylistByToken('some-token');
      assert.strictEqual(result.files.length, 1);
      assert.strictEqual(result.files[0].pieceId, 'movement1');
      assert.strictEqual(result.files[0].trackKey, 'tutti');
    });

    it('defensively decodes and parses Goja-style byte arrays (arrays of numbers) for JSON fields', async () => {
      const encodeToBytes = (str: string): number[] => {
        return Array.from(str).map(c => c.charCodeAt(0));
      };

      pb.send = (async <T>(): Promise<T> => {
        return {
          event: { id: 'evt1', title: 'Concert', date: '2026-05-21' },
          setList: encodeToBytes(JSON.stringify([
            { id: 'item1', type: 'piece', pieceId: 'piece1', title: 'Song 1' }
          ])),
          voiceParts: encodeToBytes(JSON.stringify([
            { label: 'Soprano', sectionBucketId: 'S' }
          ])),
          pieces: encodeToBytes(JSON.stringify([
            {
              id: 'piece1',
              title: 'Song 1',
              audioTrackMapping: encodeToBytes(JSON.stringify({ tutti: 'tutti.mp3' })),
              collectionName: 'musicLibrary'
            }
          ]))
        } as unknown as T;
      }) as typeof pb.send;

      const result = await playerService.fetchPlaylistByToken('some-token');

      assert.strictEqual(result.event.id, 'evt1');
      assert.strictEqual(result.voiceParts.length, 1);
      assert.strictEqual(result.voiceParts[0].label, 'Soprano');
      assert.strictEqual(result.files.length, 1);
      assert.strictEqual(result.files[0].name, 'Song 1');
      assert.strictEqual(result.files[0].trackKey, 'tutti');
      assert.strictEqual(result.files[0].availableTracks?.tutti, 'tutti.mp3');
    });
  });
});
