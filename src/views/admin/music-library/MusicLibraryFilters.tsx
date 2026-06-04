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
    onRecencyFilterChange
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
        <div className="flex-col" style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border)', gap: 'var(--space-md)' }}>
            {/* Top Search & Controls Row */}
            <div className="flex-responsive" style={{ gap: 'var(--space-md)', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    className="card"
                    placeholder="Search title, composer, catalog..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    style={{ width: '100%', maxWidth: '350px', height: '40px', padding: '0 12px' }}
                />

                <div className="flex-row" style={{ gap: 'var(--space-md)', alignItems: 'center' }}>
                    <div className="flex-row" style={{ gap: 'var(--space-md)', alignItems: 'center' }}>
                        <span className="text-sm text-muted" style={{ fontWeight: 600 }}>Last Performed:</span>
                        <select
                            className="card"
                            value={recencyFilter}
                            onChange={(e) => onRecencyFilterChange(e.target.value as PerformanceRecencyFilter)}
                            style={{ height: '40px', padding: '0 8px', minWidth: '150px', cursor: 'pointer' }}
                        >
                            <option value="all">All</option>
                            <option value="within-1-year">Within the last year</option>
                            <option value="within-2-years">Within the last 2 years</option>
                            <option value="within-3-years">Within the last 3 years</option>
                            <option value="not-within-3-years">Not performed in the last 3 years</option>
                            <option value="not-within-5-years">Not performed in the last 5 years</option>
                            <option value="never">Never Performed</option>
                        </select>
                    </div>

                    <div className="flex-row" style={{ gap: 'var(--space-md)', alignItems: 'center' }}>
                        <span className="text-sm text-muted" style={{ fontWeight: 600 }}>Page Size:</span>
                        <select
                            className="card"
                            value={pageSize}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                            style={{ height: '40px', padding: '0 8px', minWidth: '80px', cursor: 'pointer' }}
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
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
            </div>

            {/* Filter Dropdowns Row */}
            <div className="flex-responsive" style={{ gap: 'var(--space-md)', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: 'var(--space-sm)' }}>
                <div style={{ flex: '1 1 200px', display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                    <span className="text-sm text-muted" style={{ fontWeight: 600, minWidth: '70px' }}>Sections:</span>
                    <div style={{ flex: 1 }}>
                        <MultiSelectDropdown
                            options={sortedSections.map(s => ({ id: s.code, label: s.name }))}
                            selectedIds={sectionFilters}
                            onChange={onSectionFiltersChange}
                            placeholder="Sections"
                            allLabel="All Sections"
                        />
                    </div>
                </div>
                <div style={{ flex: '1 1 200px', display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                    <span className="text-sm text-muted" style={{ fontWeight: 600, minWidth: '70px' }}>Genres:</span>
                    <div style={{ flex: 1 }}>
                        <MultiSelectDropdown
                            options={[
                                { id: '__no-genre__', label: 'No Genre' },
                                ...sortedGenres.map(g => ({ id: g.id, label: g.label }))
                            ]}
                            selectedIds={genreFilters}
                            onChange={onGenreFiltersChange}
                            placeholder="Genres"
                            allLabel="All Genres"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

