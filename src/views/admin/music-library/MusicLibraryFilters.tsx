import React from 'react';
import type { SectionDef, MusicGenreDef } from '../../../services/settingsService';
import type { PerformanceRecencyFilter } from '../../../lib/music/performanceHistory';
import type { FilterMode } from '../../../lib/music/libraryRows';
import { MultiSelectDropdown } from './MultiSelectDropdown';

export interface MusicLibraryFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    sectionFilters: string[];
    onSectionFiltersChange: (value: string[]) => void;
    genreFilters: string[];
    onGenreFiltersChange: (value: string[]) => void;
    genreFilterMode: FilterMode;
    onGenreFilterModeChange: (mode: FilterMode) => void;
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
    genreFilterMode,
    onGenreFilterModeChange,
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
    const sortedGenres = React.useMemo(() => {
        return [...genres].sort((a, b) => a.label.localeCompare(b.label));
    }, [genres]);

    const sortedSections = React.useMemo(() => {
        return [...sections].sort((a, b) => a.name.localeCompare(b.name));
    }, [sections]);

    return (
        <div className="flex-col gap-[var(--space-sm)] border-b border-[var(--border)] px-[var(--space-lg)] py-[var(--space-md)]">
            <div className="grid grid-cols-3 items-end gap-[var(--space-sm)]">
                <div className="form-field-group flex-col">
                    <span className="text-muted text-xs font-semibold tracking-[0.04em] uppercase">Search</span>
                    <input
                        className="card h-9 w-full px-[10px] text-[13px]"
                        placeholder="Title, composer, catalog..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <div className="form-field-group flex-col">
                    <span className="text-muted text-xs font-semibold tracking-[0.04em] uppercase">Sections</span>
                    <MultiSelectDropdown
                        options={sortedSections.map(s => ({ id: s.code, label: s.name }))}
                        selectedIds={sectionFilters}
                        onChange={onSectionFiltersChange}
                        placeholder="Sections"
                        allLabel="All Sections"
                    />
                </div>
                <div className="form-field-group flex-col">
                    <div className="flex items-center justify-between">
                        <span className="text-muted text-xs font-semibold tracking-[0.04em] uppercase">Genres</span>
                        <div className="flex-row rounded-[4px] border border-[var(--border)] bg-[var(--bg-card-hover)] p-[2px]">
                            <button 
                                type="button" 
                                className={`min-h-auto cursor-pointer rounded-[2px] border-none bg-none px-[6px] py-[2px] text-[9px] font-bold transition-all duration-200 ${genreFilterMode === 'OR' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)]'}`}
                                onClick={() => onGenreFilterModeChange('OR')}
                                title="OR: Match ANY selected genre"
                            >
                                OR
                            </button>
                            <button 
                                type="button" 
                                className={`min-h-auto cursor-pointer rounded-[2px] border-none bg-none px-[6px] py-[2px] text-[9px] font-bold transition-all duration-200 ${genreFilterMode === 'AND' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)]'}`}
                                onClick={() => onGenreFilterModeChange('AND')}
                                title="AND: Match ALL selected genres"
                            >
                                AND
                            </button>
                        </div>
                    </div>
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

            <div className="flex-flow row wrap flex items-center gap-[var(--space-lg)] pt-[2px]">
                <div className="flex-row items-center gap-[6px]">
                    <span className="text-muted text-xs font-semibold">Last Performed:</span>
                    <select
                        className="card h-8 cursor-pointer px-[8px] text-[13px]"
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

                <div className="flex-row items-center gap-[6px]">
                    <span className="text-muted text-xs font-semibold">Per Page:</span>
                    <select
                        className="card h-8 min-w-[60px] cursor-pointer px-[8px] text-[13px]"
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>

                <label className="cursor-pointer flex-row items-center gap-[6px]">
                    <input 
                        type="checkbox" 
                        checked={showDuplicatesOnly} 
                        onChange={(e) => onShowDuplicatesOnlyChange(e.target.checked)}
                        className="size-[14px] accent-[var(--primary)]"
                    />
                    <span className="text-xs font-medium">Duplicates ({duplicateCount})</span>
                </label>

                <label className="cursor-pointer flex-row items-center gap-[6px]">
                    <input 
                        type="checkbox" 
                        checked={ignoreArticles} 
                        onChange={(e) => onIgnoreArticlesChange(e.target.checked)}
                        className="size-[14px] accent-[var(--primary)]"
                    />
                    <span className="text-xs font-medium">Ignore articles (A, An, The)</span>
                </label>

                {selectedCount > 0 && (
                    <button className="btn btn-danger btn-sm ml-auto" onClick={onBulkDelete} disabled={isBulkDeleting}>
                        {isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedCount})`}
                    </button>
                )}
            </div>
        </div>
    );
};
