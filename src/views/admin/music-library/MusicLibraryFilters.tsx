import React from 'react';
import type { SectionDef, MusicGenreDef } from '../../../services/settingsService';
import type { PerformanceRecencyFilter } from '../../../lib/music/performanceHistory';
import type { FilterMode } from '../../../lib/music/libraryRows';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { Input, Button, Select } from '../../../components/ui';

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
  onIgnoreArticlesChange,
}) => {
  const sortedGenres = React.useMemo(() => {
    return [...genres].sort((a, b) => a.label.localeCompare(b.label));
  }, [genres]);

  const sortedSections = React.useMemo(() => {
    return [...sections].sort((a, b) => a.name.localeCompare(b.name));
  }, [sections]);

  return (
    <div className="border-border flex flex-col gap-4 border-b px-4 py-3">
      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <span className="text-text-muted mb-2 block text-sm font-bold tracking-wider uppercase">
            Search
          </span>
          <Input
            type="text"
            placeholder="Title, composer, catalog..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div>
          <span className="text-text-muted mb-2 block text-sm font-bold tracking-wider uppercase">
            Sections
          </span>
          <MultiSelectDropdown
            options={sortedSections.map((s) => ({ id: s.code, label: s.name }))}
            selectedIds={sectionFilters}
            onChange={onSectionFiltersChange}
            placeholder="Sections"
            allLabel="All Sections"
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-text-muted text-sm font-bold tracking-wider uppercase">
              Genres
            </span>
            <div className="border-border flex flex-row rounded-[4px] border bg-slate-50 p-[2px]">
              <button
                type="button"
                className={`min-h-auto cursor-pointer rounded-[2px] border-none bg-none px-[6px] py-[2px] text-[9px] font-bold transition-all duration-200 ${genreFilterMode === 'OR' ? 'bg-primary text-white' : 'text-muted'}`}
                onClick={() => onGenreFilterModeChange('OR')}
                title="OR: Match ANY selected genre"
              >
                OR
              </button>
              <button
                type="button"
                className={`min-h-auto cursor-pointer rounded-[2px] border-none bg-none px-[6px] py-[2px] text-[9px] font-bold transition-all duration-200 ${genreFilterMode === 'AND' ? 'bg-primary text-white' : 'text-muted'}`}
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
              ...sortedGenres.map((g) => ({ id: g.id, label: g.label })),
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

      <div className="flex flex-row flex-wrap items-center gap-6 pt-2">
        <div className="flex flex-row items-center gap-2">
          <span className="text-text-muted text-sm font-semibold">Last Performed:</span>
          <Select
            size="small"
            className="!w-auto"
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
          </Select>
        </div>

        <div className="flex flex-row items-center gap-2">
          <span className="text-text-muted text-sm font-semibold">Per Page:</span>
          <Select
            size="small"
            className="!w-[80px] !min-w-[80px]"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </Select>
        </div>

        <label className="flex cursor-pointer flex-row items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={showDuplicatesOnly}
            onChange={(e) => onShowDuplicatesOnlyChange(e.target.checked)}
            className="border-border text-primary focus:ring-primary/25 size-4 cursor-pointer rounded"
          />
          <span className="text-text text-sm font-medium">Duplicates ({duplicateCount})</span>
        </label>

        <label className="flex cursor-pointer flex-row items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={ignoreArticles}
            onChange={(e) => onIgnoreArticlesChange(e.target.checked)}
            className="border-border text-primary focus:ring-primary/25 size-4 cursor-pointer rounded"
          />
          <span className="text-text text-sm font-medium">Ignore articles (A, An, The)</span>
        </label>

        {selectedCount > 0 && (
          <Button
            variant="danger"
            size="small"
            className="ml-auto"
            onClick={onBulkDelete}
            disabled={isBulkDeleting}
          >
            {isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedCount})`}
          </Button>
        )}
      </div>
    </div>
  );
};
