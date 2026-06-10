import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CHIP_COLORS, getChipColor } from '../../../lib/chipColorUtils';

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
            className={`relative inline-flex flex-col w-full min-w-[180px] ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
            ref={containerRef}
        >
            {label && <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">{label}</label>}
            
            {/* TRIGGER: chips variant shows inline tags */}
            {isChips ? (
                <button
                    type="button"
                    className={`flex items-center justify-between w-full min-h-10 px-3.5 py-1.5 flex-wrap gap-1 bg-white border border-gray-200 rounded-lg cursor-pointer text-left transition-all duration-200 ease-in-out outline-none hover:border-primary hover:bg-gray-50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_var(--primary-light)] card ${isOpen ? 'border-primary shadow-[0_0_0_3px_var(--primary-light)]' : ''}`}
                    onClick={toggleDropdown}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-label={ariaLabel || label || 'Multi-select dropdown'}
                >
                    {selectedOptions.length === 0 ? (
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-medium text-gray-400 flex-1 mr-2">
                            {allLabel}
                        </span>
                    ) : (
                        <span className="flex flex-wrap gap-1 flex-1 items-center">
                            {selectedOptions.map(opt => {
                                const color = chipColorMap.get(opt.id) || CHIP_COLORS[0];
                                return (
                                    <span
                                        key={opt.id}
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[11.5px] font-semibold leading-tight whitespace-nowrap transition-opacity duration-150"
                                        // @allow-inline-style - Chip colors are dynamic and stable based on option mapping.
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
                                            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-sm leading-none cursor-pointer opacity-55 hover:opacity-100 hover:bg-black/8 transition-opacity duration-150 ml-0.5"
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
                    <span className="text-[10px] text-gray-500 transition-transform duration-200 flex-shrink-0" aria-hidden="true">
                        {isOpen ? '▴' : '▾'}
                    </span>
                </button>
            ) : (
                <button
                    type="button"
                    className={`flex items-center justify-between w-full h-10 px-3.5 bg-white border border-gray-200 rounded-lg cursor-pointer text-left transition-all duration-200 ease-in-out outline-none hover:border-primary hover:bg-gray-50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_var(--primary-light)] card ${isOpen ? 'border-primary shadow-[0_0_0_3px_var(--primary-light)]' : ''}`}
                    onClick={toggleDropdown}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-label={ariaLabel || label || 'Multi-select dropdown'}
                >
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-medium text-gray-800 flex-1 mr-2" title={getSummaryText()}>
                        {getSummaryText()}
                    </span>
                    <span className="text-[10px] text-gray-500 transition-transform duration-200 flex-shrink-0" aria-hidden="true">
                        {isOpen ? '▴' : '▾'}
                    </span>
                </button>
            )}

            {isOpen && (
                <div className="absolute top-[calc(100%+6px)] left-0 w-full min-w-[240px] max-h-[350px] bg-white border border-gray-200 rounded-lg shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.05)] z-50 flex flex-col overflow-hidden animate-fade-in" role="listbox">
                    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-200 bg-gray-50">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            {selectedIds.length} selected
                        </span>
                        {selectedIds.length > 0 && (
                            <button
                                type="button"
                                className="bg-none border-none text-[11px] font-semibold text-red-500 cursor-pointer px-1.5 py-0.5 rounded transition-all duration-150 hover:bg-red-500/8"
                                onClick={handleClearAll}
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Search/filter input */}
                    {searchable && (
                        <div className="flex items-center px-3 py-2 border-b border-gray-200 relative">
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="w-full h-7.5 px-2.5 pr-7 text-xs border border-gray-200 rounded bg-white outline-none transition-colors duration-150 focus:border-primary placeholder:text-gray-400"
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
                                    className="absolute right-[18px] top-1/2 -translate-y-1/2 bg-none border-none text-base text-gray-400 cursor-pointer px-0.5 leading-none transition-colors duration-150 hover:text-gray-800"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto max-h-[220px] py-1.5">
                        {isChips ? (
                            <>
                                {filteredOptions.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 p-2.5 px-3.5">
                                        {filteredOptions.map(option => {
                                            const isChecked = selectedIds.includes(option.id);
                                            const color = chipColorMap.get(option.id) || CHIP_COLORS[0];
                                            return (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border-[1.5px] bg-white text-xs font-medium text-gray-500 cursor-pointer select-none transition-all duration-180 ease-in-out outline-none hover:border-primary hover:bg-gray-50 hover:text-gray-800 hover:shadow-[0_1px_4px_rgba(0,0,0,0.06)] focus-visible:shadow-[0_0_0_2px_var(--primary-light)] ${isChecked ? 'font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06)]' : ''}`}
                                                    role="option"
                                                    aria-selected={isChecked}
                                                    onClick={() => handleOptionToggle(option.id)}
                                                    // @allow-inline-style - Chip colors are dynamic and stable based on option mapping.
                                                    style={isChecked ? {
                                                        backgroundColor: color.bg,
                                                        borderColor: color.border,
                                                        color: color.text,
                                                    } : undefined}
                                                >
                                                    {isChecked && <span className="text-[10px] font-bold leading-none" aria-hidden="true">✓</span>}
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-xs text-gray-500">
                                        {searchQuery ? 'No matches' : 'No options available'}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {filteredOptions.map(option => {
                                    const isChecked = selectedIds.includes(option.id);
                                    return (
                                        <label 
                                            key={option.id} 
                                            className={`flex items-center px-3.5 py-1 cursor-pointer transition-all duration-150 select-none hover:bg-gray-50 ${isChecked ? 'bg-primary-light hover:bg-primary-light/80' : ''}`}
                                            role="option"
                                            aria-selected={isChecked}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleOptionToggle(option.id)}
                                                className="w-4 h-4 mr-2.5 accent-primary cursor-pointer border border-gray-200 rounded"
                                            />
                                            <span className={`text-xs font-medium text-gray-800 ${isChecked ? 'text-primary font-semibold' : ''}`}>
                                                {option.label}
                                            </span>
                                        </label>
                                    );
                                })}
                                {filteredOptions.length === 0 && (
                                    <div className="p-4 text-center text-xs text-gray-500">
                                        {searchQuery ? 'No matches' : 'No options available'}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {allowCreate && onCreateOption && (
                        <div className="flex items-center gap-2 px-3.5 py-2.5 border-t border-gray-200 bg-gray-50">
                            <input
                                ref={inputRef}
                                type="text"
                                className="flex-1 h-8 px-2.5 text-xs border border-gray-200 rounded bg-white outline-none transition-colors duration-150 focus:border-primary card"
                                placeholder="Add new..."
                                value={newOptionLabel}
                                onChange={e => setNewOptionLabel(e.target.value)}
                                onKeyDown={e => {
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
                                className="btn btn-secondary btn-sm h-8 min-h-8 px-3 text-xs inline-flex items-center justify-center rounded"
                                onClick={handleCreateOption}
                                disabled={isCreating || !newOptionLabel.trim()}
                            >
                                {isCreating ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                    )}

                    <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-end">
                        <button
                            type="button"
                            className="px-[18px] py-1.5 text-xs font-semibold text-white bg-primary border-none rounded cursor-pointer transition-colors duration-150 hover:bg-primary-dark hover:shadow-[0_1px_4px_rgba(0,0,0,0.12)] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                            onClick={() => setIsOpen(false)}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
