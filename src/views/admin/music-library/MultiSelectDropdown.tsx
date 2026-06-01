import React, { useState, useRef, useEffect } from 'react';
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
    onCreateOption
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newOptionLabel, setNewOptionLabel] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Toggle dropdown open/closed
    const toggleDropdown = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
    };

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

    // Get the display text for the trigger button
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

    return (
        <div 
            className={`multiselect-dropdown-container ${disabled ? 'disabled' : ''}`} 
            ref={containerRef}
        >
            {label && <label className="multiselect-dropdown-label">{label}</label>}
            
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

                    <div className="multiselect-dropdown-options-list">
                        {options.map(option => {
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
                        {options.length === 0 && (
                            <div className="multiselect-dropdown-no-options">
                                No options available
                            </div>
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
