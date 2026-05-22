import React from 'react';
import type { SectionDef, MusicGenreDef } from '../../../services/settingsService';

export interface MusicLibraryFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    sectionFilter: string;
    onSectionFilterChange: (value: string) => void;
    genreFilter: string;
    onGenreFilterChange: (value: string) => void;
    genres: MusicGenreDef[];
    sections: SectionDef[];
    showDuplicatesOnly: boolean;
    onShowDuplicatesOnlyChange: (value: boolean) => void;
    duplicateCount: number;
    selectedCount: number;
    isBulkDeleting: boolean;
    onBulkDelete: () => void;
}

export const MusicLibraryFilters: React.FC<MusicLibraryFiltersProps> = ({
    searchTerm,
    onSearchChange,
    sectionFilter,
    onSectionFilterChange,
    genreFilter,
    onGenreFilterChange,
    genres,
    sections,
    showDuplicatesOnly,
    onShowDuplicatesOnlyChange,
    duplicateCount,
    selectedCount,
    isBulkDeleting,
    onBulkDelete
}) => {
    return (
        <div className="flex-responsive" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border)', gap: 'var(--space-md)', justifyContent: 'space-between' }}>
            <input
                className="card"
                placeholder="Search title, composer, catalog..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{ width: '100%', maxWidth: '400px', height: '40px', padding: '0 12px' }}
            />

            <div className="flex-row" style={{ gap: 'var(--space-md)', alignItems: 'center' }}>
                <span className="text-sm text-muted">Filter by Section:</span>
                <select
                    className="card"
                    value={sectionFilter}
                    onChange={(e) => onSectionFilterChange(e.target.value)}
                    style={{ height: '40px', padding: '0 8px', minWidth: '140px', cursor: 'pointer' }}
                >
                    <option value="">All Pieces</option>
                    {sections.map(s => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex-row" style={{ gap: 'var(--space-md)', alignItems: 'center' }}>
                <span className="text-sm text-muted">Filter by Genre:</span>
                <select
                    className="card"
                    value={genreFilter}
                    onChange={(e) => onGenreFilterChange(e.target.value)}
                    style={{ height: '40px', padding: '0 8px', minWidth: '140px', cursor: 'pointer' }}
                >
                    <option value="">All Genres</option>
                    {genres.map(g => (
                        <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                </select>
            </div>
            
            <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
                <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer' }}>
                    <input 
                        type="checkbox" 
                        checked={showDuplicatesOnly} 
                        onChange={(e) => onShowDuplicatesOnlyChange(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                    />
                    <span className="text-sm">Filter Duplicates ({duplicateCount})</span>
                </label>

                {selectedCount > 0 && (
                    <button className="btn btn-danger btn-sm" onClick={onBulkDelete} disabled={isBulkDeleting}>
                        {isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedCount})`}
                    </button>
                )}
            </div>
        </div>
    );
};
