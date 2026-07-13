import React, { useState } from 'react';
import type { MessageTemplate } from '../types/Communication';
import { Input } from './ui';

const CalendarIcon = () => <span aria-hidden="true">📅</span>;
const DollarSignIcon = () => <span aria-hidden="true">💵</span>;
const AlertTriangleIcon = () => <span aria-hidden="true">⚠️</span>;
const MailIcon = () => <span aria-hidden="true">✉️</span>;
const FileTextIcon = () => <span aria-hidden="true">📄</span>;

const iconMap = {
  rehearsal: CalendarIcon,
  dues: DollarSignIcon,
  weather: AlertTriangleIcon,
  general: MailIcon,
  blank: FileTextIcon,
  attendance: CalendarIcon,
};

interface TemplateGridProps {
  templates: MessageTemplate[];
  selectedTemplateId: string;
  onSelect: (template: MessageTemplate) => void;
}

export const TemplateGrid: React.FC<TemplateGridProps> = ({
  templates,
  selectedTemplateId,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const blankTemplate: MessageTemplate = {
    id: 'blank',
    title: 'Blank Message',
    description: 'Start with a completely empty canvas.',
    category: 'general',
    channel: 'email',
    origin: 'system',
    subjectLine: '',
    content: '',
  };

  const systemTemplates = templates
    .filter((t) => t.origin === 'system' && t.category !== 'blank' && t.id !== 'blank')
    .sort((a, b) => a.title.localeCompare(b.title));

  const customTemplates = templates
    .filter((t) => t.origin === 'custom')
    .sort((a, b) => {
      const timeA = a.updated ? new Date(a.updated).getTime() : 0;
      const timeB = b.updated ? new Date(b.updated).getTime() : 0;
      return timeB - timeA;
    });

  const filterFn = (t: MessageTemplate) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(query) ||
      (t.description || '').toLowerCase().includes(query) ||
      (t.subjectLine || '').toLowerCase().includes(query)
    );
  };

  const filteredSystem = systemTemplates.filter(filterFn);
  const filteredCustom = customTemplates.filter(filterFn);
  const showBlank = !searchQuery || 'blank message'.includes(searchQuery.toLowerCase());

  const renderTemplateCard = (template: MessageTemplate) => {
    const isBlank = template.id === 'blank';
    const IconComponent = isBlank ? FileTextIcon : iconMap[template.category] || MailIcon;
    const isSelected = template.id === selectedTemplateId;

    return (
      <button
        key={template.id}
        type="button"
        role="radio"
        aria-checked={isSelected}
        onClick={() => onSelect(template)}
        className={`flex min-h-[120px] w-full cursor-pointer flex-col rounded-lg border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
          isSelected
            ? 'border-primary bg-primary-light/30 ring-primary/20 ring-2'
            : 'border-border bg-bg hover:border-primary'
        }`}
      >
        <div
          className={`mb-2.5 flex items-center justify-between ${
            isSelected ? 'text-primary-deep' : 'text-primary'
          }`}
        >
          <IconComponent />
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase ${
              isSelected ? 'bg-primary/20 text-primary-deep' : 'bg-primary-light text-primary-deep'
            }`}
          >
            {isBlank ? 'blank' : template.channel}
          </span>
        </div>
        <h4 className="text-text m-0 mb-1 text-sm font-semibold">{template.title}</h4>
        <p className="text-text-muted m-0 text-xs leading-relaxed">{template.description}</p>
        {isSelected && (
          <span className="text-text-muted mt-2 block text-xs sm:hidden">
            {template.subjectLine || template.description}
          </span>
        )}
      </button>
    );
  };

  const recentCustom = filteredCustom.slice(0, 3);
  const remainingCustom = filteredCustom.slice(3);

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Search Input */}
      <Input
        type="text"
        placeholder="Search templates..."
        value={searchQuery}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
        className="max-w-md"
      >
        <span slot="prefix" className="text-text-muted flex items-center">
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        {searchQuery && (
          <button
            slot="suffix"
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-text-muted hover:text-text flex items-center rounded-full p-0.5"
            aria-label="Clear search"
          >
            <span aria-hidden="true">❌</span>
          </button>
        )}
      </Input>

      <div role="radiogroup" aria-label="Message templates" className="flex flex-col gap-6">
        {/* Blank option */}
        {showBlank && (
          <div className="flex flex-col gap-2">
            <h5 className="text-text-muted mt-2 text-xs font-bold tracking-wider uppercase">
              Blank Slate
            </h5>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {renderTemplateCard(blankTemplate)}
            </div>
          </div>
        )}

        {/* System templates */}
        {filteredSystem.length > 0 && (
          <div className="flex flex-col gap-2">
            <h5 className="text-text-muted mt-2 text-xs font-bold tracking-wider uppercase">
              Recommended System Templates
            </h5>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {filteredSystem.map(renderTemplateCard)}
            </div>
          </div>
        )}

        {/* Custom templates */}
        {(recentCustom.length > 0 || remainingCustom.length > 0) && (
          <div className="flex flex-col gap-2">
            <h5 className="text-text-muted mt-2 text-xs font-bold tracking-wider uppercase">
              Custom Templates
            </h5>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {recentCustom.map(renderTemplateCard)}
            </div>

            {remainingCustom.length > 0 && (
              <details className="group mt-2">
                <summary className="text-primary hover:text-primary-deep flex cursor-pointer list-none items-center gap-1 text-sm font-semibold select-none [&::-webkit-details-marker]:hidden">
                  <span
                    className="transition-transform duration-200 group-open:rotate-90"
                    aria-hidden="true"
                  >
                    ▶
                  </span>
                  More templates ({remainingCustom.length})
                </summary>
                <div className="mt-3 grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2 md:grid-cols-3">
                  {remainingCustom.map(renderTemplateCard)}
                </div>
              </details>
            )}
          </div>
        )}

        {!showBlank && filteredSystem.length === 0 && filteredCustom.length === 0 && (
          <div className="text-text-muted flex flex-col items-center justify-center py-8 text-center">
            <svg
              className="mb-2 size-8 opacity-50"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="text-sm">No templates match "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
};
