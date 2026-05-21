import type { MusicPiece } from '../../../types/musicLibrary';
import type { SectionDef, VoicePartDef } from '../../../services/settingsService';

/**
 * Determines and sorts the visible track keys for a music piece.
 */
export const getVisibleTrackKeys = (
    piece: MusicPiece,
    sections: SectionDef[],
    voiceParts: VoicePartDef[],
    manuallyAdded: string[] = []
): string[] => {
    const keys = new Set<string>();
    
    // 1. Tutti is always visible
    keys.add('tutti');
    
    // 2. Default buckets (section codes)
    sections.forEach(s => keys.add(s.code));
    
    // 3. Existing uploaded keys
    if (piece.audioTrackMapping) {
        Object.entries(piece.audioTrackMapping).forEach(([k, val]) => {
            if (val) {
                keys.add(k);
            }
        });
    }
    
    // 4. Manually added keys for this piece/movement
    manuallyAdded.forEach(k => keys.add(k));
    
    const sortedKeys = Array.from(keys);
    
    const getSortPriority = (key: string): number => {
        if (key === 'tutti') return -100;
        
        const sectionIndex = sections.findIndex(s => s.code === key);
        if (sectionIndex !== -1) {
            return sectionIndex * 10;
        }
        
        const vp = voiceParts.find(v => v.label === key);
        if (vp) {
            const sIdx = sections.findIndex(s => s.code === vp.sectionCode);
            if (sIdx !== -1) {
                const vpIdx = voiceParts.filter(v => v.sectionCode === vp.sectionCode).findIndex(v => v.label === key);
                return sIdx * 10 + 1 + (vpIdx !== -1 ? vpIdx : 0);
            }
        }
        
        return 1000;
    };
    
    return sortedKeys.sort((a, b) => getSortPriority(a) - getSortPriority(b));
};
