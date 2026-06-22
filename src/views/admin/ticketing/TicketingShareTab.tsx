import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsService } from '../../../services/settingsService';
import { ticketService, type TicketBundle } from '../../../services/ticketService';
import { queryKeys } from '../../../lib/queryKeys';
import { formatInTimezone } from '../../../lib/timezone';
import { AppCard } from '../../../components/common/AppCard';
import { QRCodeShareCard } from '../../../components/admin/QRCodeShareCard';
import { useTicketingEvents } from './ticketingQueries';

const EMPTY_BUNDLES: TicketBundle[] = [];

export default function TicketingShareTab() {
  const [now] = useState(() => Date.now());

  const { events, timezone } = useTicketingEvents({ includeMissingFromPurchases: false });

  const bundlesQuery = useQuery({
    queryKey: queryKeys.ticketing.bundles(),
    queryFn: () => ticketService.getAllBundles(),
    staleTime: 30_000,
  });

  const logoQuery = useQuery({
    queryKey: queryKeys.ticketing.logoUrl,
    queryFn: () => settingsService.getLogoUrl().catch(() => null),
    staleTime: 30_000,
  });

  const bundles = bundlesQuery.data ?? EMPTY_BUNDLES;
  const logoUrl = logoQuery.data ?? null;

  const upcomingTicketingEvents = useMemo(() => {
    const cutoffTime = now - 3 * 60 * 60 * 1000;
    return events.filter((ev) => {
      const isUpcoming = new Date(ev.date).getTime() >= cutoffTime;
      return isUpcoming && ev.isTicketingEnabled;
    });
  }, [events, now]);

  const activeBundles = useMemo(() => {
    return bundles.filter((b) => b.isActive);
  }, [bundles]);

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <AppCard>
        <h3 className="text-xl font-black tracking-tight text-slate-800">
          Promotional Links & QR Codes
        </h3>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Share these links or download high-quality QR codes for your flyers, concert programs, and
          social media.
        </p>
      </AppCard>

      {/* General Ticket Storefront Section */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
          General Storefront
        </h4>
        <QRCodeShareCard
          title="Main Public Ticket Page"
          subtitle="Directs buyers to view all available tickets and pass packages"
          url="/tickets"
          badgeText="General Storefront"
          badgeTone="success"
          logoUrl={logoUrl ?? undefined}
        />
      </div>

      {/* Active Concerts Section */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
          Upcoming Concert Tickets
        </h4>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {upcomingTicketingEvents.map((ev) => (
            <QRCodeShareCard
              key={ev.id}
              title={ev.title || 'Untitled Concert'}
              subtitle={formatInTimezone(ev.date, timezone, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
              url={`/tickets/${ev.id}`}
              badgeText="Concert Ticket"
              badgeTone="performance"
              logoUrl={logoUrl ?? undefined}
            />
          ))}
          {upcomingTicketingEvents.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm font-medium text-slate-400">
              No upcoming concerts currently have ticketing enabled.
            </div>
          )}
        </div>
      </div>

      {/* Active Bundles Section */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
          Active Season Bundles
        </h4>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {activeBundles.map((b) => (
            <QRCodeShareCard
              key={b.id}
              title={b.title}
              subtitle={`Price: $${(b.priceCents / 100).toFixed(2)}`}
              url={`/tickets/bundle/${b.id}`}
              badgeText="Season Pass"
              badgeTone="success"
              logoUrl={logoUrl ?? undefined}
            />
          ))}
          {activeBundles.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm font-medium text-slate-400">
              No active season bundles configured.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
