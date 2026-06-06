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
                className={`text-label ml-table-header ml-table-header-sortable`} 
                onClick={() => onSortChange(field)}
                // @allow-inline-style - dynamic color based on sort state
                style={{ 
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                }}
            >
                <div className="flex-row ml-actions-cell-content">
                    <span>{label}</span>
                    <span 
                        className="ml-sort-indicator"
                        // @allow-inline-style - dynamic opacity based on sort state
                        style={{ 
                            opacity: isActive ? 1 : 0.35
                        }}
                    >
                        {!isActive ? '⇅' : sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                </div>
            </th>
        );
    };

    return (
        <div className="admin-view-container ml-no-margin">
            <div className="ml-table-container">
                <table className="table ml-table">
                    <thead>
                        <tr className="ml-table-header-row">
                            <th className="text-label ml-table-header ml-table-header-center ml-table-header-checkbox">
                                <input 
                                    type="checkbox" 
                                    checked={filteredPieces.length > 0 && filteredPieces.every(p => selectedIds.has(p.id))}
                                    onChange={(e) => onSelectAll(e.target.checked)}
                                    className="ml-checkbox"
                                />
                            </th>
                            {renderSortHeader('Title', 'title')}
                            {renderSortHeader('Composer/Arranger', 'composer')}
                            {renderSortHeader('Duration', 'duration')}
                            <th className="text-label ml-table-header ml-table-header-center ml-table-header-perf">Perf</th>
                            {renderSortHeader('Last Performed', 'lastPerformed')}
                            <th className="text-label ml-table-header">Tracks</th>
                            <th className="text-label ml-table-header ml-table-header-center ml-table-header-link">Link</th>
                            <th className="text-label ml-table-header ml-table-header-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={9} className="admin-loading-state">
                                    <p>Loading library...</p>
                                </td>
                            </tr>
                        ) : filteredPieces.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="admin-empty-state">
                                    <p>No pieces found.</p>
                                </td>
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
                <div className="flex-responsive no-print ml-pagination-footer">
                    <span className="text-sm text-muted ml-pagination-info">
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
