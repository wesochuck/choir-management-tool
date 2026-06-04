import React, { useState } from 'react';
import type { MusicPiece } from '../../../types/musicLibrary';
import type { MusicGenreDef } from '../../../services/settingsService';
import { toggleIdInSet, type MusicLibrarySortField, type SortDirection } from '../../../lib/music/libraryRows';
import { Pagination } from '../../../components/common/Pagination';
import { MusicLibraryRow } from './table/MusicLibraryRow';
import { getChildMovements } from './table/musicLibraryTableUtils';

export interface MusicLibraryTableProps {
    pieces: MusicPiece[];
    filteredPieces: MusicPiece[];
    genres: MusicGenreDef[];
    isLoading: boolean;
    duplicateIds: Set<string>;
    selectedIds: Set<string>;
    onToggleSelection: (id: string) => void;
    onSelectAll: (checked: boolean) => void;
    onEditPiece: (piece: MusicPiece, tab?: 'details' | 'tracks' | 'performances' | 'movements') => void;
    onPlayTrack: (piece: MusicPiece) => void;
    catalogLookupTemplate: string;
    currentPage: number;
    pageSize: number;
    totalParentCount: number;
    onPageChange: (page: number) => void;
    sortField: MusicLibrarySortField;
    sortDirection: SortDirection;
    onSortChange: (field: MusicLibrarySortField) => void;
}

export const MusicLibraryTable: React.FC<MusicLibraryTableProps> = ({
    pieces,
    filteredPieces,
    genres,
    isLoading,
    duplicateIds,
    selectedIds,
    onToggleSelection,
    onSelectAll,
    onEditPiece,
    onPlayTrack,
    catalogLookupTemplate,
    currentPage,
    pageSize,
    totalParentCount,
    onPageChange,
    sortField,
    sortDirection,
    onSortChange
}) => {
    const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(new Set());

    const toggleRowExpansion = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents triggering the row's onEditPiece modal callback
        setExpandedParentIds(prev => toggleIdInSet(prev, id));
    };

    const totalPages = Math.max(1, Math.ceil(totalParentCount / pageSize));

    const renderSortHeader = (label: string, field: MusicLibrarySortField) => {
        const isActive = sortField === field;
        return (
            <th 
                className="text-label" 
                onClick={() => onSortChange(field)}
                style={{ 
                    padding: '6px 10px', 
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)', 
                    border: '1px solid var(--border)', 
                    fontWeight: 600,
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{label}</span>
                    <span style={{ 
                        fontSize: '10px', 
                        opacity: isActive ? 1 : 0.35,
                        display: 'inline-block'
                    }}>
                        {!isActive ? '⇅' : sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                </div>
            </th>
        );
    };

    return (
        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left', border: '1px solid var(--border)' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--primary-light)' }}>
                            <th className="text-label" style={{ width: '40px', textAlign: 'center', padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>
                                <input 
                                    type="checkbox" 
                                    checked={filteredPieces.length > 0 && filteredPieces.every(p => selectedIds.has(p.id))}
                                    onChange={(e) => onSelectAll(e.target.checked)}
                                    style={{ minHeight: 'auto', width: '14px', height: '14px', margin: 0, verticalAlign: 'middle', cursor: 'pointer' }}
                                />
                            </th>
                            {renderSortHeader('Title', 'title')}
                            {renderSortHeader('Composer/Arranger', 'composer')}
                            {renderSortHeader('Duration', 'duration')}
                            {renderSortHeader('Last Performed', 'lastPerformed')}
                            <th className="text-label" style={{ padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Tracks</th>
                            <th className="text-label" style={{ width: '60px', textAlign: 'center', padding: '6px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Link</th>
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
                                // Exclude child records from the top-level loop to prevent duplicate entries
                                if (piece.parentId) return null;

                                const isExpanded = expandedParentIds.has(piece.id);
                                const movements = getChildMovements(piece, pieces);

                                return (
                                    <React.Fragment key={piece.id}>
                                        {/* Primary Parent Row */}
                                        <MusicLibraryRow
                                            piece={piece}
                                            allPieces={pieces}
                                            isChildMovement={false}
                                            isExpanded={isExpanded}
                                            duplicateIds={duplicateIds}
                                            selectedIds={selectedIds}
                                            genres={genres}
                                            catalogLookupTemplate={catalogLookupTemplate}
                                            onToggleSelection={onToggleSelection}
                                            onToggleExpansion={toggleRowExpansion}
                                            onEditPiece={onEditPiece}
                                            onPlayTrack={onPlayTrack}
                                        />

                                        {/* Sub-Movement Rows Rendered Contextually */}
                                        {isExpanded && movements.map(movement => (
                                            <MusicLibraryRow
                                                key={movement.id}
                                                piece={movement}
                                                allPieces={pieces}
                                                isChildMovement={true}
                                                isExpanded={false}
                                                duplicateIds={duplicateIds}
                                                selectedIds={selectedIds}
                                                genres={genres}
                                                catalogLookupTemplate={catalogLookupTemplate}
                                                onToggleSelection={onToggleSelection}
                                                onToggleExpansion={toggleRowExpansion}
                                                onEditPiece={onEditPiece}
                                                onPlayTrack={onPlayTrack}
                                            />
                                        ))}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Premium Pagination Navigation Controls */}
            {!isLoading && totalParentCount > 0 && (
                <div className="flex-responsive no-print" style={{ 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: 'var(--space-md) var(--space-lg)', 
                    borderTop: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-card, #fff)',
                    borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                    marginTop: 'var(--space-xs)'
                }}>
                    <span className="text-sm text-muted" style={{ fontWeight: 500 }}>
                        Showing {Math.min((currentPage - 1) * pageSize + 1, totalParentCount)}–{Math.min(currentPage * pageSize, totalParentCount)} of {totalParentCount} pieces
                    </span>

                    <Pagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={onPageChange}
                    />
                </div>
            )}
        </div>
    );
};
