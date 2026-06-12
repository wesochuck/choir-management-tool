import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CHIP_COLORS, getChipColor } from '../../../lib/chipColorUtils';
import { Button } from '../../../components/ui';

interface MultiSelectOption {
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
            className={`relative inline-flex w-full min-w-[180px] flex-col ${disabled ? 'pointer-events-none opacity-60' : ''}`}
            ref={containerRef}
        >
            {label && <label className="mb-1.5 text-xs font-semibold tracking-wider text-gray-500 uppercase">{label}</label>}
            
            {/* TRIGGER: chips variant shows inline tags */}
            {isChips ? (
                <button
                    type="button"
                    className={`flex min-h-10 w-full cursor-pointer flex-wrap items-center justify-between gap-1 rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-left shadow-sm transition-all duration-200 ease-in-out outline-none hover:border-primary hover:bg-gray-50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_var(--color-primary-light)] ${isOpen ? 'border-primary shadow-[0_0_0_3px_var(--color-primary-light)]' : ''}`}
                    onClick={toggleDropdown}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-label={ariaLabel || label || 'Multi-select dropdown'}
                >
                    {selectedOptions.length === 0 ? (
                        <span className="mr-2 flex-1 truncate text-sm font-medium text-gray-400">
                            {allLabel}
                        </span>
                    ) : (
                        <span className="flex flex-1 flex-wrap items-center gap-1">
                            {selectedOptions.map(opt => {
                                const color = chipColorMap.get(opt.id) || CHIP_COLORS[0];
                                return (
                                    <span
                                        key={opt.id}
                                        className="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11.5px] leading-tight font-semibold whitespace-nowrap transition-opacity duration-150"
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
                                            className="ml-0.5 inline-flex size-3.5 cursor-pointer items-center justify-center rounded-full text-sm leading-none opacity-55 transition-opacity duration-150 hover:bg-black/8 hover:opacity-100"
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
                    <span className="flex-shrink-0 text-[10px] text-gray-500 transition-transform duration-200" aria-hidden="true">
                        {isOpen ? '▴' : '▾'}
                    </span>
                </button>
            ) : (
                <button
                    type="button"
                    className={`flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white px-3.5 text-left shadow-sm transition-all duration-200 ease-in-out outline-none hover:border-primary hover:bg-gray-50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_var(--color-primary-light)] ${isOpen ? 'border-primary shadow-[0_0_0_3px_var(--color-primary-light)]' : ''}`}
                    onClick={toggleDropdown}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-label={ariaLabel || label || 'Multi-select dropdown'}
                >
                    <span className="mr-2 flex-1 truncate text-sm font-medium text-gray-800" title={getSummaryText()}>
                        {getSummaryText()}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-gray-500 transition-transform duration-200" aria-hidden="true">
                        {isOpen ? '▴' : '▾'}
                    </span>
                </button>
            )}

            {isOpen && (
                <div className="animate-fade-in absolute top-[calc(100%+6px)] left-0 z-50 flex max-h-[350px] w-full min-w-[240px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.05)]" role="listbox">
                    <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3.5 py-2.5">
                        <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                            {selectedIds.length} selected
                        </span>
                        {selectedIds.length > 0 && (
                            <button
                                type="button"
                                className="cursor-pointer rounded border-none bg-none px-1.5 py-0.5 text-[11px] font-semibold text-red-500 transition-all duration-150 hover:bg-red-500/8"
                                onClick={handleClearAll}
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Search/filter input */}
                    {searchable && (
                        <div className="relative flex items-center border-b border-gray-200 px-3 py-2">
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="h-7.5 w-full rounded border border-gray-200 bg-white px-2.5 pr-7 text-xs transition-colors duration-150 outline-none placeholder:text-gray-400 focus:border-primary"
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
                                    className="absolute top-1/2 right-[18px] -translate-y-1/2 cursor-pointer border-none bg-none px-0.5 text-base leading-none text-gray-400 transition-colors duration-150 hover:text-gray-800"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    )}

                    <div className="max-h-[220px] flex-1 overflow-y-auto py-1.5">
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
                                                    className={`inline-flex cursor-pointer items-center gap-1 rounded-full border-[1.5px] bg-white px-3 py-1 text-xs font-medium text-gray-500 transition-all duration-180 ease-in-out outline-none select-none hover:border-primary hover:bg-gray-50 hover:text-gray-800 hover:shadow-[0_1px_4px_rgba(0,0,0,0.06)] focus-visible:shadow-[0_0_0_2px_var(--color-primary-light)] ${isChecked ? 'font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06)]' : ''}`}
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
                                                    {isChecked && <span className="text-[10px] leading-none font-bold" aria-hidden="true">✓</span>}
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
                                            className={`flex cursor-pointer items-center px-3.5 py-1 transition-all duration-150 select-none hover:bg-gray-50 ${isChecked ? 'bg-primary-light hover:bg-primary-light/80' : ''}`}
                                            role="option"
                                            aria-selected={isChecked}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleOptionToggle(option.id)}
                                                className="mr-2.5 size-4 cursor-pointer rounded border border-gray-200 accent-primary"
                                            />
                                            <span className={`text-xs font-medium text-gray-800 ${isChecked ? 'font-semibold text-primary' : ''}`}>
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
                        <div className="flex items-center gap-2 border-t border-gray-200 bg-gray-50 px-3.5 py-2.5">
                            <input
                                ref={inputRef}
                                type="text"
                                className="h-8 flex-1 rounded border border-border bg-surface px-2.5 text-xs transition-colors duration-150 outline-none focus:border-primary"
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
                            <Button
                                type="button"
                                variant="secondary"
                                size="small"
                                className="inline-flex h-8 min-h-8 items-center justify-center rounded px-3 text-xs"
                                onClick={handleCreateOption}
                                disabled={isCreating || !newOptionLabel.trim()}
                            >
                                {isCreating ? 'Adding...' : 'Add'}
                            </Button>
                        </div>
                    )}

                    <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-3 py-2">
                        <button
                            type="button"
                            className="hover:bg-primary-deep cursor-pointer rounded border-none bg-primary px-[18px] py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:shadow-[0_1px_4px_rgba(0,0,0,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
