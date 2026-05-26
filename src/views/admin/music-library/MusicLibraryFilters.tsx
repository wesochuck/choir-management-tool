import React from 'react';
import type { SectionDef, MusicGenreDef } from '../../../services/settingsService';

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
    onPageSizeChange
}) => {
    // Sort genres alphabetically by label
    const sortedGenres = React.useMemo(() => {
        return [...genres].sort((a, b) => a.label.localeCompare(b.label));
    }, [genres]);

    // Sort sections alphabetically by name
    const sortedSections = React.useMemo(() => {
        return [...sections].sort((a, b) => a.name.localeCompare(b.name));
    }, [sections]);

    const handleGenreToggle = (genreId: string) => {
        const next = genreFilters.includes(genreId)
            ? genreFilters.filter(id => id !== genreId)
            : [...genreFilters, genreId];
        onGenreFiltersChange(next);
    };

    const handleSectionToggle = (sectionCode: string) => {
        const next = sectionFilters.includes(sectionCode)
            ? sectionFilters.filter(code => code !== sectionCode)
            : [...sectionFilters, sectionCode];
        onSectionFiltersChange(next);
    };

    const isAllGenresActive = genreFilters.length === 0;
    const isAllSectionsActive = sectionFilters.length === 0;

    const pillStyle = (isActive: boolean) => ({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 14px',
        borderRadius: '20px',
        border: isActive ? '1px solid var(--primary, #1b4d3e)' : '1px solid var(--border)',
        backgroundColor: isActive ? 'var(--primary-light, rgba(27, 77, 62, 0.08))' : 'var(--card-bg, #ffffff)',
        color: isActive ? 'var(--primary, #1b4d3e)' : 'var(--text, #1e293b)',
        fontWeight: isActive ? '600' : '500',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isActive ? '0 2px 4px rgba(27, 77, 62, 0.08)' : 'none',
        outline: 'none',
    });

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

            {/* Section Pills Row */}
            <div className="flex-responsive" style={{ gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
                <span className="text-sm text-muted" style={{ fontWeight: 600, minWidth: '80px', marginTop: '6px' }}>Sections:</span>
                <div className="flex-row" style={{ gap: 'var(--space-xs)', flexWrap: 'wrap', flex: 1 }}>
                    <button
                        type="button"
                        style={pillStyle(isAllSectionsActive)}
                        onClick={() => onSectionFiltersChange([])}
                    >
                        All Sections
                    </button>
                    {sortedSections.map(s => {
                        const isActive = sectionFilters.includes(s.code);
                        return (
                            <button
                                key={s.code}
                                type="button"
                                style={pillStyle(isActive)}
                                onClick={() => handleSectionToggle(s.code)}
                            >
                                {s.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Genre Pills Row */}
            <div className="flex-responsive" style={{ gap: 'var(--space-sm)', alignItems: 'flex-start', borderTop: '1px dashed var(--border)', paddingTop: 'var(--space-sm)' }}>
                <span className="text-sm text-muted" style={{ fontWeight: 600, minWidth: '80px', marginTop: '6px' }}>Genres:</span>
                <div className="flex-row" style={{ gap: 'var(--space-xs)', flexWrap: 'wrap', flex: 1 }}>
                    <button
                        type="button"
                        style={pillStyle(isAllGenresActive)}
                        onClick={() => onGenreFiltersChange([])}
                    >
                        All Genres
                    </button>
                    {sortedGenres.map(g => {
                        const isActive = genreFilters.includes(g.id);
                        return (
                            <button
                                key={g.id}
                                type="button"
                                style={pillStyle(isActive)}
                                onClick={() => handleGenreToggle(g.id)}
                            >
                                {g.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

