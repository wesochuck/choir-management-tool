import React, { useState } from 'react';
import type { MessageTemplate } from '../types/Communication';
import { Input } from './ui';

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const DollarSignIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

const AlertTriangleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"></path>
    <path d="M22 2 11 13"></path>
  </svg>
);

const FileTextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <line x1="10" y1="9" x2="8" y2="9"></line>
  </svg>
);

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

const getCategoryForTemplate = (title: string): 'auditions' | 'payments' | 'tickets' | 'general' => {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('audition')) return 'auditions';
  if (titleLower.includes('donation') || titleLower.includes('due') || titleLower.includes('payment') || titleLower.includes('receipt')) return 'payments';
  if (titleLower.includes('ticket')) return 'tickets';
  return 'general';
};

export const TemplateGrid: React.FC<TemplateGridProps> = ({ templates, selectedTemplateId, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const blankTemplate = templates.find(t => t.category === 'blank') || {
    id: 'blank',
    title: 'Blank Message',
    description: 'Start with a completely empty canvas.',
    category: 'blank' as const,
    channel: 'email' as const,
    origin: 'system' as const,
    subjectLine: '',
    content: ''
  };

  const regularTemplates = templates.filter(t => t.category !== 'blank');
  const BlankIcon = iconMap.blank;

  const filteredTemplates = regularTemplates.filter(template => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.title.toLowerCase().includes(query) ||
      (template.description || '').toLowerCase().includes(query) ||
      (template.subjectLine || '').toLowerCase().includes(query)
    );
  });

  const showBlank = !searchQuery || 'blank message'.includes(searchQuery.toLowerCase()) || 'scratch'.includes(searchQuery.toLowerCase());

  const grouped = {
    general: filteredTemplates.filter(t => getCategoryForTemplate(t.title) === 'general'),
    auditions: filteredTemplates.filter(t => getCategoryForTemplate(t.title) === 'auditions'),
    payments: filteredTemplates.filter(t => getCategoryForTemplate(t.title) === 'payments'),
    tickets: filteredTemplates.filter(t => getCategoryForTemplate(t.title) === 'tickets'),
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
        <span slot="prefix" className="flex items-center text-text-muted">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        {searchQuery && (
          <button
            slot="suffix"
            type="button"
            onClick={() => setSearchQuery('')}
            className="flex items-center rounded-full p-0.5 text-text-muted hover:text-text"
            aria-label="Clear search"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </Input>

      {/* Grouped Lists */}
      {categories.map(cat => {
        const catTemplates = cat.id === 'general' 
          ? (showBlank ? [blankTemplate, ...grouped.general] : grouped.general)
          : grouped[cat.id];

        if (catTemplates.length === 0) return null;

        return (
          <div key={cat.id} className="flex flex-col gap-2">
            <h5 className="mt-2 text-xs font-bold tracking-wider text-text-muted uppercase">
              {cat.title}
            </h5>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {catTemplates.map(template => {
                const isBlank = template.id === 'blank';
                const IconComponent = isBlank ? BlankIcon : (iconMap[template.category] || MailIcon);
                const isSelected = template.id === selectedTemplateId;
                
                return (
                  <div 
                    key={template.id} 
                    className={`flex min-h-[120px] cursor-pointer flex-col rounded-lg border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected
                        ? 'border-primary bg-primary-light/30 ring-2 ring-primary/20'
                        : 'border-border bg-bg hover:border-primary'
                    }`} 
                    onClick={() => onSelect(template)}
                  >
                    <div className={`mb-2.5 flex items-center justify-between ${isSelected ? 'text-primary-deep' : 'text-primary'}`}>
                      <IconComponent />
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase ${
                        isSelected 
                          ? 'bg-primary/20 text-primary-deep' 
                          : 'bg-primary-light text-primary-deep'
                      }`}>
                        {isBlank ? 'blank' : template.channel}
                      </span>
                    </div>
                    <h4 className="m-0 mb-1 text-sm font-semibold text-text">{template.title}</h4>
                    <p className="m-0 text-xs leading-relaxed text-text-muted">{template.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {Object.values(grouped).every(arr => arr.length === 0) && !showBlank && (
        <div className="flex flex-col items-center justify-center py-8 text-center text-text-muted">
          <svg className="mb-2 size-8 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p className="text-sm">No templates match "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};
