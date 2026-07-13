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
    <div className="grid grid-cols-3 gap-2 md:gap-4">
      {cards.map((card, index) => {
        const styles = colorStyles[card.color];
        const commonClassName = `flex flex-col items-center justify-center rounded-lg border p-4 text-center ${styles.card} ${
          onCardClick
            ? 'cursor-pointer transition-all duration-250 hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 active:scale-95'
            : ''
        }`;

        if (onCardClick) {
          return (
            <button
              key={card.label}
              type="button"
              className={commonClassName}
              onClick={() => onCardClick(index)}
              aria-label={`${card.label}: ${card.count}. ${card.subtitle}`}
            >
              <span
                className={`text-[10px] font-bold tracking-wider uppercase md:text-xs ${styles.label}`}
              >
                {card.label}
              </span>
              <span className={`mt-1 text-xl font-extrabold md:text-3xl ${styles.count}`}>
                {card.count}
              </span>
              <span className={`mt-1 hidden text-xs sm:block md:text-sm ${styles.subtitle}`}>
                {card.subtitle}
              </span>
            </button>
          );
        }

        return (
          <div key={card.label} className={commonClassName}>
            <span
              className={`text-[10px] font-bold tracking-wider uppercase md:text-xs ${styles.label}`}
            >
              {card.label}
            </span>
            <span className={`mt-1 text-xl font-extrabold md:text-3xl ${styles.count}`}>
              {card.count}
            </span>
            <span className={`mt-1 hidden text-xs sm:block md:text-sm ${styles.subtitle}`}>
              {card.subtitle}
            </span>
          </div>
        );
      })}
    </div>
  );
}
