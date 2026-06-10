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
        <div className="flex-col px-[var(--space-lg)] py-[var(--space-md)] border-b border-[var(--border)] gap-[var(--space-sm)]">
            <div className="grid grid-cols-3 gap-[var(--space-sm)] items-end">
                <div className="flex-col form-field-group">
                    <span className="text-xs text-muted font-semibold uppercase tracking-[0.04em]">Search</span>
                    <input
                        className="card w-full h-9 px-[10px] text-[13px]"
                        placeholder="Title, composer, catalog..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <div className="flex-col form-field-group">
                    <span className="text-xs text-muted font-semibold uppercase tracking-[0.04em]">Sections</span>
                    <MultiSelectDropdown
                        options={sortedSections.map(s => ({ id: s.code, label: s.name }))}
                        selectedIds={sectionFilters}
                        onChange={onSectionFiltersChange}
                        placeholder="Sections"
                        allLabel="All Sections"
                    />
                </div>
                <div className="flex-col form-field-group">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted font-semibold uppercase tracking-[0.04em]">Genres</span>
                        <div className="flex-row bg-[var(--bg-card-hover)] border border-[var(--border)] rounded-[4px] p-[2px]">
                            <button 
                                type="button" 
                                className={`border-none bg-none px-[6px] py-[2px] text-[9px] font-bold cursor-pointer rounded-[2px] min-h-auto transition-all duration-200 ${genreFilterMode === 'OR' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)]'}`}
                                onClick={() => onGenreFilterModeChange('OR')}
                                title="OR: Match ANY selected genre"
                            >
                                OR
                            </button>
                            <button 
                                type="button" 
                                className={`border-none bg-none px-[6px] py-[2px] text-[9px] font-bold cursor-pointer rounded-[2px] min-h-auto transition-all duration-200 ${genreFilterMode === 'AND' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)]'}`}
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

            <div className="flex flex-flow row wrap gap-[var(--space-lg)] items-center pt-[2px]">
                <div className="flex-row gap-[6px] items-center">
                    <span className="text-xs text-muted font-semibold">Last Performed:</span>
                    <select
                        className="card h-8 px-[8px] text-[13px] cursor-pointer"
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

                <div className="flex-row gap-[6px] items-center">
                    <span className="text-xs text-muted font-semibold">Per Page:</span>
                    <select
                        className="card h-8 px-[8px] text-[13px] cursor-pointer min-w-[60px]"
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>

                <label className="flex-row items-center gap-[6px] cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={showDuplicatesOnly} 
                        onChange={(e) => onShowDuplicatesOnlyChange(e.target.checked)}
                        className="w-[14px] h-[14px] accent-[var(--primary)]"
                    />
                    <span className="text-xs font-medium">Duplicates ({duplicateCount})</span>
                </label>

                <label className="flex-row items-center gap-[6px] cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={ignoreArticles} 
                        onChange={(e) => onIgnoreArticlesChange(e.target.checked)}
                        className="w-[14px] h-[14px] accent-[var(--primary)]"
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
