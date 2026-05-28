import React from 'react';
import type { MessageTemplate } from '../types/Communication';

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-icon">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const DollarSignIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-icon">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

const AlertTriangleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-icon">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-icon">
    <path d="m22 2-7 20-4-9-9-4Z"></path>
    <path d="M22 2 11 13"></path>
  </svg>
);

const FileTextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-icon">
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
  onSelect: (template: MessageTemplate) => void;
}

export const TemplateGrid: React.FC<TemplateGridProps> = ({ templates, onSelect }) => {
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

  return (
    <div className="template-container">
      {/* Isolate Blank Message */}
      {blankTemplate && (
        <div className="blank-template-card" onClick={() => onSelect(blankTemplate)}>
          <div className="card-header">
            <BlankIcon />
            <span className="badge">blank</span>
          </div>
          <div>
            <h4>{blankTemplate.title}</h4>
            <p>{blankTemplate.description}</p>
          </div>
        </div>
      )}

      {/* Standard Grid */}
      <div className="template-grid">
        {regularTemplates.map(template => {
          const IconComponent = iconMap[template.category] || MailIcon;
          return (
            <div key={template.id} className="template-card" onClick={() => onSelect(template)}>
              <div className="card-header">
                <IconComponent />
                <span className="badge">{template.channel}</span>
              </div>
              <h4>{template.title}</h4>
              <p>{template.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
