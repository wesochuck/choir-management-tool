import React from 'react';
import type { SectionDef, MusicGenreDef } from '../../../services/settingsService';
import type { PerformanceRecencyFilter } from '../../../lib/music/performanceHistory';
import { MultiSelectDropdown } from './MultiSelectDropdown';

export interface MusicLibraryFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    sectionFilters: string[];
    onSectionFiltersChange: (value: string[]) => void;
    genreFilters: string[];
    onGenreFiltersChange: (value: string[]) => void;
    genres: MusicGenreDef[];
    sections: SectionDef[];
    showDuplicatesOnly: boolean;
    onShowDuplicatesOnlyChange: (value: boolean) => void;
    duplicateCount: number;
    selectedCount: number;
    isBulkDeleting: boolean;
    onBulkDelete: () => void;
    pageSize: number;
    onPageSizeChange: (value: number) => void;
    recencyFilter: PerformanceRecencyFilter;
    onRecencyFilterChange: (value: PerformanceRecencyFilter) => void;
    ignoreArticles: boolean;
    onIgnoreArticlesChange: (value: boolean) => void;
}

export const MusicLibraryFilters: React.FC<MusicLibraryFiltersProps> = ({
    searchTerm,
    onSearchChange,
    sectionFilters,
    onSectionFiltersChange,
    genreFilters,
    onGenreFiltersChange,
    genres,
    sections,
    showDuplicatesOnly,
    onShowDuplicatesOnlyChange,
    duplicateCount,
    selectedCount,
    isBulkDeleting,
    onBulkDelete,
    pageSize,
    onPageSizeChange,
    recencyFilter,
    onRecencyFilterChange,
    ignoreArticles,
    onIgnoreArticlesChange
}) => {
    // Sort genres alphabetically by label
    const sortedGenres = React.useMemo(() => {
        return [...genres].sort((a, b) => a.label.localeCompare(b.label));
    }, [genres]);

    // Sort sections alphabetically by name
    const sortedSections = React.useMemo(() => {
        return [...sections].sort((a, b) => a.name.localeCompare(b.name));
    }, [sections]);

    return (
        <div className="flex-col" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border)', gap: 'var(--space-sm)' }}>
            {/* Row 1: Search + Filter Dropdowns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)', alignItems: 'end' }}>
                <div className="flex-col" style={{ gap: '4px' }}>
                    <span className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Search</span>
                    <input
                        className="card"
                        placeholder="Title, composer, catalog..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        style={{ width: '100%', height: '36px', padding: '0 10px', fontSize: '13px' }}
                    />
                </div>
                <div className="flex-col" style={{ gap: '4px' }}>
                    <span className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sections</span>
                    <MultiSelectDropdown
                        options={sortedSections.map(s => ({ id: s.code, label: s.name }))}
                        selectedIds={sectionFilters}
                        onChange={onSectionFiltersChange}
                        placeholder="Sections"
                        allLabel="All Sections"
                    />
                </div>
                <div className="flex-col" style={{ gap: '4px' }}>
                    <span className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Genres</span>
                    <MultiSelectDropdown
                        options={[
                            { id: '__no-genre__', label: 'No Genre' },
                            ...sortedGenres.map(g => ({ id: g.id, label: g.label }))
                        ]}
                        selectedIds={genreFilters}
                        onChange={onGenreFiltersChange}
                        placeholder="Genres"
                        allLabel="All Genres"
                        variant="chips"
                        searchable
                    />
                </div>
            </div>

            {/* Row 2: Secondary Controls */}
            <div className="flex-row" style={{ gap: 'var(--space-lg)', alignItems: 'center', flexWrap: 'wrap', paddingTop: '2px' }}>
                <div className="flex-row" style={{ gap: '6px', alignItems: 'center' }}>
                    <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Last Performed:</span>
                    <select
                        className="card"
                        value={recencyFilter}
                        onChange={(e) => onRecencyFilterChange(e.target.value as PerformanceRecencyFilter)}
                        style={{ height: '32px', padding: '0 8px', fontSize: '13px', cursor: 'pointer' }}
                    >
                        <option value="all">All</option>
                        <option value="within-1-year">Within 1 year</option>
                        <option value="within-2-years">Within 2 years</option>
                        <option value="within-3-years">Within 3 years</option>
                        <option value="not-within-3-years">Not in 3 years</option>
                        <option value="not-within-5-years">Not in 5 years</option>
                        <option value="never">Never Performed</option>
                    </select>
                </div>

                <div className="flex-row" style={{ gap: '6px', alignItems: 'center' }}>
                    <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Per Page:</span>
                    <select
                        className="card"
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        style={{ height: '32px', padding: '0 8px', fontSize: '13px', minWidth: '60px', cursor: 'pointer' }}
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>

                <label className="flex-row" style={{ alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input 
                        type="checkbox" 
                        checked={showDuplicatesOnly} 
                        onChange={(e) => onShowDuplicatesOnlyChange(e.target.checked)}
                        style={{ width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                    />
                    <span className="text-xs" style={{ fontWeight: 500 }}>Duplicates ({duplicateCount})</span>
                </label>

                <label className="flex-row" style={{ alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input 
                        type="checkbox" 
                        checked={ignoreArticles} 
                        onChange={(e) => onIgnoreArticlesChange(e.target.checked)}
                        style={{ width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                    />
                    <span className="text-xs" style={{ fontWeight: 500 }}>Ignore articles (A, An, The)</span>
                </label>

                {selectedCount > 0 && (
                    <button className="btn btn-danger btn-sm" onClick={onBulkDelete} disabled={isBulkDeleting} style={{ marginLeft: 'auto' }}>
                        {isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedCount})`}
                    </button>
                )}
            </div>
        </div>
    );
};
