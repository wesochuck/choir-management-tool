import React from 'react';
import type { SectionDef, MusicGenreDef } from '../../../services/settingsService';
import type { PerformanceRecencyFilter } from '../../../lib/music/performanceHistory';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import './MusicLibraryEditors.css';

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
        <div className="flex-col mle-filters-container">
            {/* Row 1: Search + Filter Dropdowns */}
            <div className="mle-filters-row1">
                <div className="flex-col form-field-group">
                    <span className="text-xs text-muted mle-filters-field-label">Search</span>
                    <input
                        className="card mle-filters-input"
                        placeholder="Title, composer, catalog..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <div className="flex-col form-field-group">
                    <span className="text-xs text-muted mle-filters-field-label">Sections</span>
                    <MultiSelectDropdown
                        options={sortedSections.map(s => ({ id: s.code, label: s.name }))}
                        selectedIds={sectionFilters}
                        onChange={onSectionFiltersChange}
                        placeholder="Sections"
                        allLabel="All Sections"
                    />
                </div>
                <div className="flex-col form-field-group">
                    <span className="text-xs text-muted mle-filters-field-label">Genres</span>
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
            <div className="mle-filters-row2">
                <div className="mle-filters-select-group">
                    <span className="text-xs text-muted mle-filters-select-label">Last Performed:</span>
                    <select
                        className="card mle-filters-select"
                        value={recencyFilter}
                        onChange={(e) => onRecencyFilterChange(e.target.value as PerformanceRecencyFilter)}
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

                <div className="mle-filters-select-group">
                    <span className="text-xs text-muted mle-filters-select-label">Per Page:</span>
                    <select
                        className="card mle-filters-select mle-filters-select-per-page"
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>

                <label className="mle-filters-checkbox-label">
                    <input 
                        type="checkbox" 
                        checked={showDuplicatesOnly} 
                        onChange={(e) => onShowDuplicatesOnlyChange(e.target.checked)}
                        className="mle-filters-checkbox"
                    />
                    <span className="text-xs mle-filters-checkbox-text">Duplicates ({duplicateCount})</span>
                </label>

                <label className="mle-filters-checkbox-label">
                    <input 
                        type="checkbox" 
                        checked={ignoreArticles} 
                        onChange={(e) => onIgnoreArticlesChange(e.target.checked)}
                        className="mle-filters-checkbox"
                    />
                    <span className="text-xs mle-filters-checkbox-text">Ignore articles (A, An, The)</span>
                </label>

                {selectedCount > 0 && (
                    <button className="btn btn-danger btn-sm mle-filters-bulk-delete" onClick={onBulkDelete} disabled={isBulkDeleting}>
                        {isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedCount})`}
                    </button>
                )}
            </div>
        </div>
    );
};
