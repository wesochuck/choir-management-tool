import React from 'react';

interface StatCardConfig {
  label: string;
  count: number;
  subtitle: string;
  color: 'neutral' | 'emerald' | 'blue';
}

interface AudienceStatCardsProps {
  cards: StatCardConfig[];
  onCardClick?: (index: number) => void;
}

const colorStyles: Record<
  string,
  { card: string; label: string; count: string; subtitle: string }
> = {
  neutral: {
    card: 'border-border bg-slate-50/50',
    label: 'text-text-muted',
    count: 'text-text',
    subtitle: 'text-text-muted',
  },
  emerald: {
    card: 'border-emerald-100 bg-emerald-50/30',
    label: 'text-emerald-800',
    count: 'text-emerald-900',
    subtitle: 'text-emerald-700',
  },
  blue: {
    card: 'border-blue-100 bg-blue-50/30',
    label: 'text-blue-800',
    count: 'text-blue-900',
    subtitle: 'text-blue-700',
  },
};

export function AudienceStatCards({ cards, onCardClick }: AudienceStatCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((card, index) => {
        const styles = colorStyles[card.color];
        return (
          <div
            key={card.label}
            className={`flex flex-col items-center justify-center rounded-lg border p-4 text-center ${styles.card} ${
              onCardClick
                ? 'cursor-pointer transition-all duration-250 hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 active:scale-95'
                : ''
            }`}
            onClick={() => onCardClick?.(index)}
          >
            <span className={`text-xs font-bold tracking-wider uppercase ${styles.label}`}>
              {card.label}
            </span>
            <span className={`mt-1 text-3xl font-extrabold ${styles.count}`}>{card.count}</span>
            <span className={`mt-1 text-sm ${styles.subtitle}`}>{card.subtitle}</span>
          </div>
        );
      })}
    </div>
  );
}
