import React, { useState } from 'react';
import type { MusicPiece } from '../../types/musicLibrary';
import type { MusicGenreDef } from '../../services/settingsService';
import { toggleIdInSet, type MusicLibrarySortField, type SortDirection } from '../../lib/music/libraryRows';
import { Pagination } from '../../components/common/Pagination';
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
        e.stopPropagation();
        setExpandedParentIds(prev => toggleIdInSet(prev, id));
    };

    const totalPages = Math.max(1, Math.ceil(totalParentCount / pageSize));

    const renderSortHeader = (label: string, field: MusicLibrarySortField) => {
        const isActive = sortField === field;
        return (
            <th 
                className={`text-label px-[10px] py-[6px] text-[var(--text-muted)] border border-[var(--border)] font-semibold select-none cursor-pointer`}
                // @allow-inline-style - dynamic color based on sort state
                style={{ 
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                }}
                onClick={() => onSortChange(field)}
            >
                <div className="flex gap-[var(--space-xs)] items-center">
                    <span>{label}</span>
                    <span 
                        className="text-[10px] inline-block"
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
        <div className="!m-0">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left border border-[var(--border)]">
                    <thead>
                        <tr className="bg-[var(--primary-light)]">
                            <th className="text-label px-[10px] py-[6px] text-[var(--text-muted)] border border-[var(--border)] font-semibold text-center w-10">
                                <input 
                                    type="checkbox" 
                                    checked={filteredPieces.length > 0 && filteredPieces.every(p => selectedIds.has(p.id))}
                                    onChange={(e) => onSelectAll(e.target.checked)}
                                    className="!min-h-auto !w-[14px] !h-[14px] !m-0 align-middle cursor-pointer"
                                />
                            </th>
                            {renderSortHeader('Title', 'title')}
                            {renderSortHeader('Composer/Arranger', 'composer')}
                            {renderSortHeader('Duration', 'duration')}
                            <th className="text-label px-[10px] py-[6px] text-[var(--text-muted)] border border-[var(--border)] font-semibold text-center w-[50px]">Perf</th>
                            {renderSortHeader('Last Performed', 'lastPerformed')}
                            <th className="text-label px-[10px] py-[6px] text-[var(--text-muted)] border border-[var(--border)] font-semibold">Tracks</th>
                            <th className="text-label px-[10px] py-[6px] text-[var(--text-muted)] border border-[var(--border)] font-semibold text-center w-[60px]">Link</th>
                            <th className="text-label px-[10px] py-[6px] text-[var(--text-muted)] border border-[var(--border)] font-semibold w-20">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={9} className="flex items-center justify-center py-12">
                                    <p>Loading library...</p>
                                </td>
                            </tr>
                        ) : filteredPieces.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="flex flex-col items-center justify-center py-12 text-text-muted">
                                    <p>No pieces found.</p>
                                </td>
                            </tr>
                        ) : (
                            filteredPieces.map(piece => {
                                if (piece.parentId) return null;

                                const isExpanded = expandedParentIds.has(piece.id);
                                const movements = getChildMovements(piece, pieces);

                                return (
                                    <React.Fragment key={piece.id}>
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

            {!isLoading && totalParentCount > 0 && (
                <div className="flex justify-between items-center px-[var(--space-lg)] py-[var(--space-md)] border-t border-[var(--border)] bg-[var(--bg-card,#fff)] rounded-[0_0_var(--radius-md)_var(--radius-md)] mt-[var(--space-xs)]">
                    <span className="text-sm text-muted font-medium">
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
