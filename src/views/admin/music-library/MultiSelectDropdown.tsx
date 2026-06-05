import React, { useState, useRef, useEffect, useMemo } from 'react';
import './MultiSelectDropdown.css';

export interface MultiSelectOption {
    id: string;
    label: string;
}

export interface MultiSelectDropdownProps {
    options: MultiSelectOption[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    label?: string;
    ariaLabel?: string;
    placeholder?: string;
    allLabel?: string;
    disabled?: boolean;
    allowCreate?: boolean;
    onCreateOption?: (label: string) => Promise<MultiSelectOption> | MultiSelectOption;
    /** 'default' = checkbox list, 'chips' = colored pill tags with inline chips on trigger */
    variant?: 'default' | 'chips';
    /** Show a search/filter input inside the dropdown (useful when ≥6 options) */
    searchable?: boolean;
}

/** Stable HSL palette for chip colors, cycling through hues */
const CHIP_COLORS = [
    { bg: 'rgba(27, 77, 62, 0.10)', border: 'rgba(27, 77, 62, 0.30)', text: '#1b4d3e' },     // forest
    { bg: 'rgba(59, 130, 246, 0.10)', border: 'rgba(59, 130, 246, 0.30)', text: '#1e40af' },   // blue
    { bg: 'rgba(168, 85, 247, 0.10)', border: 'rgba(168, 85, 247, 0.30)', text: '#7c3aed' },   // purple
    { bg: 'rgba(234, 88, 12, 0.10)', border: 'rgba(234, 88, 12, 0.30)', text: '#c2410c' },     // orange
    { bg: 'rgba(236, 72, 153, 0.10)', border: 'rgba(236, 72, 153, 0.30)', text: '#be185d' },   // pink
    { bg: 'rgba(20, 184, 166, 0.10)', border: 'rgba(20, 184, 166, 0.30)', text: '#0f766e' },   // teal
    { bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.30)', text: '#b45309' },   // amber
    { bg: 'rgba(99, 102, 241, 0.10)', border: 'rgba(99, 102, 241, 0.30)', text: '#4338ca' },   // indigo
];

function getChipColor(index: number) {
    return CHIP_COLORS[index % CHIP_COLORS.length];
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
    options,
    selectedIds,
    onChange,
    label,
    ariaLabel,
    placeholder = 'Select...',
    allLabel = 'All',
    disabled = false,
    allowCreate = false,
    onCreateOption,
    variant = 'default',
    searchable = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newOptionLabel, setNewOptionLabel] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const isChips = variant === 'chips';

    // Toggle dropdown open/closed
    const toggleDropdown = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
    };

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 30);
        }
        if (!isOpen) {
            setSearchQuery('');
        }
    }, [isOpen, searchable]);

    // Close on clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Close on Escape key press
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Handle selecting/deselecting an option
    const handleOptionToggle = (optionId: string) => {
        const nextSelected = selectedIds.includes(optionId)
            ? selectedIds.filter(id => id !== optionId)
            : [...selectedIds, optionId];
        onChange(nextSelected);
    };

    // Remove a chip from the trigger bar
    const handleRemoveChip = (e: React.MouseEvent, optionId: string) => {
        e.stopPropagation();
        onChange(selectedIds.filter(id => id !== optionId));
    };

    // Clear all selections
    const handleClearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    // Create a new option inline
    const handleCreateOption = async (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const trimmed = newOptionLabel.trim();
        if (!trimmed || !onCreateOption) return;

        setIsCreating(true);
        try {
            const newOpt = await onCreateOption(trimmed);
            if (newOpt && newOpt.id) {
                // Select the newly created option
                if (!selectedIds.includes(newOpt.id)) {
                    onChange([...selectedIds, newOpt.id]);
                }
                setNewOptionLabel('');
            }
        } catch (err) {
            console.error('Failed to create option in dropdown', err);
        } finally {
            setIsCreating(false);
            // Focus back to input
            inputRef.current?.focus();
        }
    };

    // Build a stable color map based on sorted option ids
    const chipColorMap = useMemo(() => {
        const map = new Map<string, { bg: string; border: string; text: string }>();
        const sorted = [...options].sort((a, b) => a.label.localeCompare(b.label));
        sorted.forEach((opt, idx) => {
            map.set(opt.id, getChipColor(idx));
        });
        return map;
    }, [options]);

    // Filtered options by search query
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const q = searchQuery.toLowerCase().trim();
        return options.filter(o => o.label.toLowerCase().includes(q));
    }, [options, searchQuery]);

    // Get the display text for the trigger button (default variant)
    const getSummaryText = () => {
        if (selectedIds.length === 0) {
            return allLabel;
        }

        const selectedLabels = selectedIds
            .map(id => options.find(o => o.id === id)?.label)
            .filter(Boolean) as string[];

        if (selectedLabels.length === 0) {
            return allLabel;
        }

        if (selectedLabels.length <= 2) {
            return selectedLabels.join(', ');
        }

        return `${selectedIds.length} ${placeholder.toLowerCase()} selected`;
    };

    // Resolved selected options for chip display
    const selectedOptions = useMemo(() => {
        return selectedIds
            .map(id => options.find(o => o.id === id))
            .filter((o): o is MultiSelectOption => Boolean(o));
    }, [selectedIds, options]);

    return (
        <div 
            className={`multiselect-dropdown-container ${disabled ? 'disabled' : ''}`} 
            ref={containerRef}
        >
            {label && <label className="multiselect-dropdown-label">{label}</label>}
            
            {/* TRIGGER: chips variant shows inline tags */}
            {isChips ? (
                <button
                    type="button"
                    className={`multiselect-dropdown-trigger multiselect-dropdown-trigger--chips card ${isOpen ? 'active' : ''}`}
                    onClick={toggleDropdown}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-label={ariaLabel || label || 'Multi-select dropdown'}
                >
                    {selectedOptions.length === 0 ? (
                        <span className="multiselect-dropdown-summary multiselect-dropdown-placeholder">
                            {allLabel}
                        </span>
                    ) : (
                        <span className="multiselect-chip-bar">
                            {selectedOptions.map(opt => {
                                const color = chipColorMap.get(opt.id) || CHIP_COLORS[0];
                                return (
                                    <span
                                        key={opt.id}
                                        className="multiselect-chip"
                                        style={{
                                            backgroundColor: color.bg,
                                            borderColor: color.border,
                                            color: color.text,
                                        }}
                                    >
                                        {opt.label}
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            className="multiselect-chip-remove"
                                            onClick={(e) => handleRemoveChip(e, opt.id)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRemoveChip(e as unknown as React.MouseEvent, opt.id); }}
                                            aria-label={`Remove ${opt.label}`}
                                        >
                                            ×
                                        </span>
                                    </span>
                                );
                            })}
                        </span>
                    )}
                    <span className="multiselect-dropdown-arrow" aria-hidden="true">
                        {isOpen ? '▴' : '▾'}
                    </span>
                </button>
            ) : (
                <button
                    type="button"
                    className={`multiselect-dropdown-trigger card ${isOpen ? 'active' : ''}`}
                    onClick={toggleDropdown}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-label={ariaLabel || label || 'Multi-select dropdown'}
                >
                    <span className="multiselect-dropdown-summary" title={getSummaryText()}>
                        {getSummaryText()}
                    </span>
                    <span className="multiselect-dropdown-arrow" aria-hidden="true">
                        {isOpen ? '▴' : '▾'}
                    </span>
                </button>
            )}

            {isOpen && (
                <div className="multiselect-dropdown-menu animate-fade-in" role="listbox">
                    <div className="multiselect-dropdown-header">
                        <span className="multiselect-dropdown-count">
                            {selectedIds.length} selected
                        </span>
                        {selectedIds.length > 0 && (
                            <button
                                type="button"
                                className="multiselect-dropdown-clear-btn"
                                onClick={handleClearAll}
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Search/filter input */}
                    {searchable && (
                        <div className="multiselect-dropdown-search">
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="multiselect-dropdown-search-input"
                                placeholder="Filter..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Escape') {
                                        e.stopPropagation();
                                        if (searchQuery) {
                                            setSearchQuery('');
                                        } else {
                                            setIsOpen(false);
                                        }
                                    }
                                }}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="multiselect-dropdown-search-clear"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    )}

                    <div className="multiselect-dropdown-options-list">
                        {isChips ? (
                            /* Chips variant: pill-style tags */
                            <>
                                {filteredOptions.length > 0 ? (
                                    <div className="multiselect-chip-grid">
                                        {filteredOptions.map(option => {
                                            const isChecked = selectedIds.includes(option.id);
                                            const color = chipColorMap.get(option.id) || CHIP_COLORS[0];
                                            return (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    className={`multiselect-chip-option ${isChecked ? 'selected' : ''}`}
                                                    role="option"
                                                    aria-selected={isChecked}
                                                    onClick={() => handleOptionToggle(option.id)}
                                                    style={isChecked ? {
                                                        backgroundColor: color.bg,
                                                        borderColor: color.border,
                                                        color: color.text,
                                                    } : undefined}
                                                >
                                                    {isChecked && <span className="multiselect-chip-check" aria-hidden="true">✓</span>}
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="multiselect-dropdown-no-options">
                                        {searchQuery ? 'No matches' : 'No options available'}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* Default variant: checkbox list */
                            <>
                                {filteredOptions.map(option => {
                                    const isChecked = selectedIds.includes(option.id);
                                    return (
                                        <label 
                                            key={option.id} 
                                            className={`multiselect-dropdown-item ${isChecked ? 'selected' : ''}`}
                                            role="option"
                                            aria-selected={isChecked}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleOptionToggle(option.id)}
                                                className="multiselect-dropdown-checkbox"
                                            />
                                            <span className="multiselect-dropdown-item-label">
                                                {option.label}
                                            </span>
                                        </label>
                                    );
                                })}
                                {filteredOptions.length === 0 && (
                                    <div className="multiselect-dropdown-no-options">
                                        {searchQuery ? 'No matches' : 'No options available'}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {allowCreate && onCreateOption && (
                        <div className="multiselect-dropdown-create-panel">
                            <input
                                ref={inputRef}
                                type="text"
                                className="card multiselect-dropdown-create-input"
                                placeholder="Add new..."
                                value={newOptionLabel}
                                onChange={e => setNewOptionLabel(e.target.value)}
                                onKeyDown={e => {
                                    // Prevent Enter key from submitting the parent form
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCreateOption(e);
                                    }
                                }}
                                disabled={isCreating}
                            />
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm multiselect-dropdown-create-btn"
                                onClick={handleCreateOption}
                                disabled={isCreating || !newOptionLabel.trim()}
                            >
                                {isCreating ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
