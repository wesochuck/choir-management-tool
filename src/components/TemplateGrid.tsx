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
  selectedTemplateId: string | null;
  onSelect: (template: MessageTemplate) => void;
}

const getCategoryForTemplate = (
  title: string
): 'auditions' | 'payments' | 'tickets' | 'general' => {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('audition')) return 'auditions';
  if (
    titleLower.includes('donation') ||
    titleLower.includes('due') ||
    titleLower.includes('payment') ||
    titleLower.includes('receipt')
  )
    return 'payments';
  if (titleLower.includes('ticket')) return 'tickets';
  return 'general';
};

export const TemplateGrid: React.FC<TemplateGridProps> = ({
  templates,
  selectedTemplateId,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const blankTemplate = templates.find((t) => t.category === 'blank') || {
    id: 'blank',
    title: 'Blank Message',
    description: 'Start with a completely empty canvas.',
    category: 'blank' as const,
    channel: 'email' as const,
    origin: 'system' as const,
    subjectLine: '',
    content: '',
  };

  const regularTemplates = templates.filter((t) => t.category !== 'blank');
  const BlankIcon = iconMap.blank;

  const filteredTemplates = regularTemplates.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.title.toLowerCase().includes(query) ||
      (template.description || '').toLowerCase().includes(query) ||
      (template.subjectLine || '').toLowerCase().includes(query)
    );
  });

  const showBlank =
    !searchQuery ||
    'blank message'.includes(searchQuery.toLowerCase()) ||
    'scratch'.includes(searchQuery.toLowerCase());

  const grouped = {
    general: filteredTemplates.filter((t) => getCategoryForTemplate(t.title) === 'general'),
    auditions: filteredTemplates.filter((t) => getCategoryForTemplate(t.title) === 'auditions'),
    payments: filteredTemplates.filter((t) => getCategoryForTemplate(t.title) === 'payments'),
    tickets: filteredTemplates.filter((t) => getCategoryForTemplate(t.title) === 'tickets'),
  };

  const categories = [
    { id: 'general', title: 'General & Basics' },
    { id: 'auditions', title: 'Auditions' },
    { id: 'payments', title: 'Payments & Donations' },
    { id: 'tickets', title: 'Tickets' },
  ] as const;

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

      {/* Grouped Lists */}
      {categories.map((cat) => {
        const catTemplates =
          cat.id === 'general'
            ? showBlank
              ? [blankTemplate, ...grouped.general]
              : grouped.general
            : grouped[cat.id];

        if (catTemplates.length === 0) return null;

        return (
          <div key={cat.id} className="flex flex-col gap-2">
            <h5 className="text-text-muted mt-2 text-xs font-bold tracking-wider uppercase">
              {cat.title}
            </h5>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {catTemplates.map((template) => {
                const isBlank = template.id === 'blank';
                const IconComponent = isBlank ? BlankIcon : iconMap[template.category] || MailIcon;
                const isSelected = template.id === selectedTemplateId;

                return (
                  <div
                    key={template.id}
                    className={`flex min-h-[120px] cursor-pointer flex-col rounded-lg border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected
                        ? 'border-primary bg-primary-light/30 ring-primary/20 ring-2'
                        : 'border-border bg-bg hover:border-primary'
                    }`}
                    onClick={() => onSelect(template)}
                  >
                    <div
                      className={`mb-2.5 flex items-center justify-between ${isSelected ? 'text-primary-deep' : 'text-primary'}`}
                    >
                      <IconComponent />
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase ${
                          isSelected
                            ? 'bg-primary/20 text-primary-deep'
                            : 'bg-primary-light text-primary-deep'
                        }`}
                      >
                        {isBlank ? 'blank' : template.channel}
                      </span>
                    </div>
                    <h4 className="text-text m-0 mb-1 text-sm font-semibold">{template.title}</h4>
                    <p className="text-text-muted m-0 text-xs leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {Object.values(grouped).every((arr) => arr.length === 0) && !showBlank && (
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
  );
};
