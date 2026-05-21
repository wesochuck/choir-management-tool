import React from 'react';
import type { MusicPiece } from '../../../types/musicLibrary';
import type { SectionDef } from '../../../services/settingsService';
import { 
    formatPerformanceHistory, 
    parseDurationToSeconds, 
    formatSecondsToDuration, 
    resolveCatalogLookupUrl 
} from '../../../lib/musicPieceUtils';

export interface MusicLibraryTableProps {
    pieces: MusicPiece[];
    filteredPieces: MusicPiece[];
    sections: SectionDef[];
    isLoading: boolean;
    duplicateIds: Set<string>;
    selectedIds: Set<string>;
    onToggleSelection: (id: string) => void;
    onSelectAll: (checked: boolean) => void;
    onEditPiece: (piece: MusicPiece) => void;
    onPlayTrack: (piece: MusicPiece) => void;
    catalogLookupTemplate: string;
}

export const MusicLibraryTable: React.FC<MusicLibraryTableProps> = ({
    pieces,
    filteredPieces,
    sections,
    isLoading,
    duplicateIds,
    selectedIds,
    onToggleSelection,
    onSelectAll,
    onEditPiece,
    onPlayTrack,
    catalogLookupTemplate
}) => {
    return (
        <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', border: '1px solid var(--border)' }}>
                <thead>
                    <tr style={{ backgroundColor: 'var(--primary-light)' }}>
                        <th className="text-label" style={{ width: '40px', textAlign: 'center', padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>
                            <input 
                                type="checkbox" 
                                checked={filteredPieces.length > 0 && selectedIds.size === filteredPieces.length}
                                onChange={(e) => onSelectAll(e.target.checked)}
                                style={{ minHeight: 'auto', width: '14px', height: '14px', margin: 0, verticalAlign: 'middle', cursor: 'pointer' }}
                            />
                        </th>
                        <th className="text-label" style={{ padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Title</th>
                        <th className="text-label" style={{ padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Composer/Arranger</th>
                        <th className="text-label" style={{ padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Duration</th>
                        <th className="text-label" style={{ padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Copies</th>
                        <th className="text-label" style={{ padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Catalog ID</th>
                        <th className="text-label" style={{ padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Tracks</th>
                        <th className="text-label" style={{ width: '80px', padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '12px', border: '1px solid var(--border)' }}>Loading library...</td>
                        </tr>
                    ) : filteredPieces.length === 0 ? (
                        <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '12px', border: '1px solid var(--border)' }}>No pieces found.</td>
                        </tr>
                    ) : (
                        filteredPieces.map(piece => {
                            const isDuplicate = duplicateIds.has(piece.id);
                            const isParent = pieces.some(p => p.parentId === piece.id);
                            const isChild = !!piece.parentId;
                            
                            const hasOwnTracks = !!(piece.audioTrackMapping && Object.keys(piece.audioTrackMapping).some(k => piece.audioTrackMapping?.[k]));
                            const hasMovementTracks = pieces.some(m => m.parentId === piece.id && m.audioTrackMapping && Object.keys(m.audioTrackMapping).some(k => m.audioTrackMapping?.[k]));
                            const hasTracks = hasOwnTracks || hasMovementTracks;

                            const childMovements = pieces.filter(m => m.parentId === piece.id);
                            const totalMovementTracksCount = childMovements.reduce((acc, m) => {
                                const mMapping = m.audioTrackMapping || {};
                                const mCount = Object.keys(mMapping).filter(k => mMapping[k]).length;
                                return acc + mCount;
                            }, 0);

                            return (
                                <tr 
                                    key={piece.id} 
                                    className="relative-row"
                                    onClick={() => onEditPiece(piece)}
                                    style={{ 
                                        backgroundColor: isDuplicate ? 'rgba(255, 138, 101, 0.05)' : isChild ? 'rgba(248, 250, 252, 0.4)' : undefined, 
                                        cursor: 'pointer' 
                                    }}
                                >
                                    <td style={{ textAlign: 'center', padding: '6px 10px', border: '1px solid var(--border)' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.has(piece.id)}
                                            onChange={() => onToggleSelection(piece.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ minHeight: 'auto', width: '14px', height: '14px', margin: 0, verticalAlign: 'middle', cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td style={{ 
                                        padding: '6px 10px', 
                                        paddingLeft: isChild ? '28px' : '10px',
                                        border: '1px solid var(--border)', 
                                        verticalAlign: 'middle' 
                                    }}>
                                        <div className="flex-col" style={{ gap: '2px' }}>
                                            <div className="flex-row" style={{ alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                {isChild && (
                                                    <span className="text-xs text-muted" style={{ fontFamily: 'monospace', marginRight: '2px', userSelect: 'none' }}>
                                                        └─
                                                    </span>
                                                )}
                                                <strong style={{ color: isDuplicate ? '#e64a19' : 'inherit' }}>{piece.title}</strong>
                                                {hasTracks && (
                                                    <span 
                                                        title="Has learning tracks" 
                                                        style={{ 
                                                            fontSize: '13px', 
                                                            lineHeight: 1, 
                                                            cursor: 'default',
                                                            display: 'inline-flex',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        🎧
                                                    </span>
                                                )}
                                                {isParent && (
                                                    <span style={{ 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        padding: '2px 6px', 
                                                        borderRadius: '4px', 
                                                        backgroundColor: 'var(--primary-light, rgba(27, 77, 62, 0.1))', 
                                                        color: 'var(--primary, #1b4d3e)', 
                                                        fontSize: '10px', 
                                                        fontWeight: 600,
                                                        border: '1px solid rgba(27, 77, 62, 0.2)',
                                                        lineHeight: '1.2'
                                                    }}>
                                                        Multi-Movement
                                                    </span>
                                                )}
                                                {isChild && (
                                                    <span style={{ 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        padding: '1px 5px', 
                                                        borderRadius: '4px', 
                                                        backgroundColor: 'rgba(100, 116, 139, 0.1)', 
                                                        color: 'var(--text-muted, #64748b)', 
                                                        fontSize: '9px', 
                                                        fontWeight: 500,
                                                        border: '1px solid rgba(100, 116, 139, 0.2)',
                                                        lineHeight: '1.2'
                                                    }}>
                                                        Movement
                                                    </span>
                                                )}
                                            </div>
                                            {piece.performances && piece.performances.length > 0 && (
                                                <span className="text-xs text-muted" title={formatPerformanceHistory(piece).join('\n')}>
                                                    {piece.performances.length} historical performances
                                                </span>
                                            )}
                                            <div className="flex-row" style={{ gap: 'var(--space-xs)', marginTop: '2px', flexWrap: 'wrap' }}>
                                                {!piece.sectionBuckets || piece.sectionBuckets.length === 0 ? (
                                                    <span className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.6, fontSize: '10px' }}>
                                                        All Sections
                                                    </span>
                                                ) : (
                                                    piece.sectionBuckets.map(code => {
                                                        const section = sections.find(s => s.code === code);
                                                        return (
                                                            <span 
                                                                key={code}
                                                                title={section ? section.name : code}
                                                                style={{ 
                                                                    display: 'inline-flex',
                                                                    padding: '1px 5px',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: 'var(--bg-card-hover)',
                                                                    border: '1px solid var(--border)',
                                                                    fontSize: '10px',
                                                                    fontWeight: 600,
                                                                    color: 'var(--text-muted)'
                                                                }}
                                                            >
                                                                {code}
                                                            </span>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>{piece.composer || '-'}</td>
                                    <td style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>
                                        {piece.duration ? formatSecondsToDuration(parseDurationToSeconds(piece.duration)) : '-'}
                                    </td>
                                    <td style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>{piece.copies !== undefined ? piece.copies : '-'}</td>
                                    <td style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>
                                        {piece.catalogId ? (
                                            resolveCatalogLookupUrl(catalogLookupTemplate, piece.catalogId) ? (
                                                <a 
                                                    href={resolveCatalogLookupUrl(catalogLookupTemplate, piece.catalogId)!} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ color: 'var(--color-primary, #1b4d3e)', textDecoration: 'underline', fontWeight: 500 }}
                                                >
                                                    {piece.catalogId}
                                                </a>
                                            ) : piece.catalogId
                                        ) : '-'}
                                    </td>
                                    <td style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>
                                        {piece.audioTrackMapping && Object.keys(piece.audioTrackMapping).length > 0 ? (
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onPlayTrack(piece);
                                                }}
                                                style={{ 
                                                    padding: '2px 8px', 
                                                    height: '24px', 
                                                    minHeight: '24px', 
                                                    fontSize: '11px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    margin: 0
                                                }}
                                            >
                                                🎵 Play
                                            </button>
                                        ) : isParent && totalMovementTracksCount > 0 ? (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                backgroundColor: 'rgba(27, 77, 62, 0.08)',
                                                color: 'var(--primary, #1b4d3e)',
                                                fontSize: '11px',
                                                fontWeight: 500,
                                                border: '1px solid rgba(27, 77, 62, 0.15)',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                🎧 {totalMovementTracksCount} track{totalMovementTracksCount !== 1 ? 's' : ''} in movements
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted">-</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'middle' }}>
                                        <div className="flex-row" style={{ gap: 'var(--space-xs)', justifyContent: 'center' }}>
                                            <button 
                                                className="btn btn-ghost btn-sm" 
                                                onClick={(e) => { e.stopPropagation(); onEditPiece(piece); }}
                                                style={{ minHeight: 'auto', height: '24px', padding: '0 8px', fontSize: '0.75rem', margin: 0 }}
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};
