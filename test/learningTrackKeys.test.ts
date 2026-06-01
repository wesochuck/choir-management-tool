import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getVisibleTrackKeys } from '../src/views/admin/music-library/learningTrackKeys';
import type { MusicPiece } from '../src/types/musicLibrary';
import type { SectionDef, VoicePartDef } from '../src/services/settingsService';

describe('getVisibleTrackKeys', () => {
    const sections: SectionDef[] = [
        { code: 'S', name: 'Sopranos' },
        { code: 'A', name: 'Altos' }
    ];

    const voiceParts: VoicePartDef[] = [
        { label: 'S1', fullName: 'Soprano 1', sectionCode: 'S' },
        { label: 'S2', fullName: 'Soprano 2', sectionCode: 'S' },
        { label: 'A1', fullName: 'Alto 1', sectionCode: 'A' },
        { label: 'A2', fullName: 'Alto 2', sectionCode: 'A' }
    ];

    const basePiece: MusicPiece = {
        id: 'p1',
        title: 'Song',
        audioTrackMapping: {},
        collectionId: '',
        collectionName: '',
        created: '',
        updated: ''
    };

    it('always includes tutti and section codes', () => {
        const keys = getVisibleTrackKeys(basePiece, sections, voiceParts);
        assert.ok(keys.includes('tutti'));
        assert.ok(keys.includes('S'));
        assert.ok(keys.includes('A'));
    });

    it('includes existing tracks from mapping', () => {
        const pieceWithTracks = {
            ...basePiece,
            audioTrackMapping: {
                'S1': 's1.mp3',
                'Bass': 'bass.mp3'
            }
        };
        const keys = getVisibleTrackKeys(pieceWithTracks, sections, voiceParts);
        assert.ok(keys.includes('S1'));
        assert.ok(keys.includes('Bass'));
    });

    it('includes manually added parts', () => {
        const keys = getVisibleTrackKeys(basePiece, sections, voiceParts, ['Tenor']);
        assert.ok(keys.includes('Tenor'));
    });

    it('sorts keys correctly (Tutti first, then sections/parts)', () => {
        const pieceWithTracks = {
            ...basePiece,
            audioTrackMapping: {
                'S1': 's1.mp3',
                'A2': 'a2.mp3'
            }
        };
        const keys = getVisibleTrackKeys(pieceWithTracks, sections, voiceParts);
        
        // Expected order: tutti, S, S1, A, A2
        assert.strictEqual(keys[0], 'tutti');
        assert.strictEqual(keys[1], 'S');
        assert.strictEqual(keys[2], 'S1');
        assert.strictEqual(keys[3], 'A');
        assert.strictEqual(keys[4], 'A2');
    });

    it('handles unknown keys with low priority', () => {
        const keys = getVisibleTrackKeys(basePiece, sections, voiceParts, ['ZUnknown']);
        assert.strictEqual(keys[keys.length - 1], 'ZUnknown');
    });
});
