import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Event } from '../../services/eventService';
import { ticketService } from '../../services/ticketService';
import { queryKeys } from '../../lib/queryKeys';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { Input, Textarea, Button } from '../ui';
import { useSetup } from '../../contexts/SetupContext';

export interface EventTicketsTabProps {
  isOpen: boolean;
  formData: Partial<Event>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Event>>>;
  initialData?: Event | null;
  isGraphicRemoved: boolean;
  graphicPreviewUrl: string;
  advancePriceInput: string;
  setAdvancePriceInput: (v: string) => void;
  dayOfPriceInput: string;
  setDayOfPriceInput: (v: string) => void;
  eventGraphicFile: File | null;
  setEventGraphicFile: (f: File | null) => void;
  setIsGraphicRemoved: (v: boolean) => void;
}

export const EventTicketsTab: React.FC<EventTicketsTabProps> = ({
  isOpen,
  formData,
  setFormData,
  initialData,
  isGraphicRemoved,
  graphicPreviewUrl,
  advancePriceInput,
  setAdvancePriceInput,
  dayOfPriceInput,
  setDayOfPriceInput,
  eventGraphicFile,
  setEventGraphicFile,
  setIsGraphicRemoved,
}) => {
  const { timezone } = useChoirSettings();
  const { enabledModules } = useSetup();
  const ticketSalesEnabled = enabledModules.has('ticketSales');

  const { data: hasPurchases = false } = useQuery({
    queryKey: [...queryKeys.tickets.all, 'hasPurchases', initialData?.id],
    queryFn: () => {
      if (!initialData?.id) return false;
      return ticketService.hasPaidPurchasesForEvent(initialData.id);
    },
    enabled: ticketSalesEnabled && isOpen && !!initialData?.id,
  });

  const dayOfLiveText = useMemo(() => {
    if (!formData.date) return '';
    try {
      const dateParts = formData.date.split('T')[0];
      if (!dateParts) return '';
      const [year, month, day] = dateParts.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      if (isNaN(d.getTime())) return '';

      const formattedDate = d.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      let tzAbbr = '';
      try {
        const formatter = new Intl.DateTimeFormat([], {
          timeZone: timezone,
          timeZoneName: 'short',
        });
        const parts = formatter.formatToParts(new Date());
        const tzPart = parts.find((p) => p.type === 'timeZoneName');
        tzAbbr = tzPart ? ` ${tzPart.value}` : '';
      } catch {
        // Fallback to empty string if timeZoneName is unsupported
      }

      return `Live on the day of the show: ${formattedDate} (12:00 AM - 11:59 PM${tzAbbr})`;
    } catch {
      return '';
    }
  }, [formData.date, timezone]);

  return (
    <>
      <div className="text-primary-deep text-sm font-extrabold tracking-tight">
        🎟️ Ticketing Configuration
      </div>

      <label className="flex cursor-pointer flex-row items-center gap-2">
        <input
          type="checkbox"
          checked={formData.isTicketingEnabled || false}
          onChange={(e) => setFormData({ ...formData, isTicketingEnabled: e.target.checked })}
          className="border-border text-primary focus:ring-primary size-4 rounded-sm focus:ring-offset-0"
        />
        <span className="text-text text-sm font-bold">Enable Online Ticket Sales</span>
      </label>

      {ticketSalesEnabled && formData.isTicketingEnabled && (
        <div className="border-primary bg-primary/10 mt-2 rounded-lg border-l-4 p-4 shadow-sm">
          <div className="text-text-muted flex flex-col gap-2 text-sm">
            <div>
              <strong className="text-text">⚙️ Admin:</strong>{' '}
              <a
                href="/admin/tickets"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-deep font-bold underline transition-colors"
              >
                Go to Ticketing Dashboard
              </a>
            </div>
            {initialData?.id && (
              <div>
                <strong className="text-text">🔗 Storefront Link:</strong>{' '}
                <a
                  href={`/tickets/${initialData.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-deep font-bold underline transition-colors"
                >
                  View Concert Ticket Page
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {ticketSalesEnabled && hasPurchases && !formData.isTicketingEnabled && (
        <div className="border-warning-border bg-warning-bg mt-2 rounded-lg border p-4 shadow-sm">
          <strong className="text-warning-text text-sm font-bold">⚠️ Existing Ticket Sales</strong>
          <p className="text-warning-text/90 m-0 mt-2 text-sm leading-relaxed font-medium">
            This event already has active ticket sales. Disabling ticket sales hides it from the
            storefront, but you can still view its Will Call checklist and process refunds in the{' '}
            <a
              href="/admin/tickets"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-warning-text/70 font-bold underline transition-colors"
            >
              Ticketing Dashboard
            </a>{' '}
            by checking <em>"Include past & inactive performances"</em>.
          </p>
        </div>
      )}

      {formData.isTicketingEnabled && (
        <div className="flex flex-col gap-6 pt-2">
          <label className="flex cursor-pointer flex-row items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isFreeRSVP || false}
              onChange={(e) => setFormData({ ...formData, isFreeRSVP: e.target.checked })}
              className="border-border text-primary focus:ring-primary size-4 rounded-sm focus:ring-offset-0"
            />
            <span className="text-text text-sm font-bold">Is Free RSVP Event (Bypass Stripe)</span>
          </label>

          {!formData.isFreeRSVP ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label">Advance Price ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 15.00"
                  value={advancePriceInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAdvancePriceInput(val);
                    const parsed = parseFloat(val);
                    if (val === '') {
                      setFormData((prev) => ({ ...prev, advancePriceCents: undefined }));
                    } else if (!isNaN(parsed)) {
                      setFormData((prev) => ({
                        ...prev,
                        advancePriceCents: Math.round(parsed * 100),
                      }));
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label">Day-Of Price ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 20.00"
                  value={dayOfPriceInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDayOfPriceInput(val);
                    const parsed = parseFloat(val);
                    if (val === '') {
                      setFormData((prev) => ({ ...prev, dayOfPriceCents: undefined }));
                    } else if (!isNaN(parsed)) {
                      setFormData((prev) => ({
                        ...prev,
                        dayOfPriceCents: Math.round(parsed * 100),
                      }));
                    }
                  }}
                />
                {dayOfLiveText && (
                  <div className="text-primary mt-1 text-[0.7rem] font-bold tracking-tight">
                    {dayOfLiveText}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label">Max Quantity Per RSVP</label>
                <Input
                  type="number"
                  placeholder="e.g. 2"
                  value={formData.maxPerRSVP === undefined ? '' : formData.maxPerRSVP}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxPerRSVP: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-label">Ticket Capacity</label>
              <Input
                type="number"
                placeholder="e.g. 150"
                value={formData.ticketCapacity === undefined ? '' : formData.ticketCapacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ticketCapacity: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-label">Doors Open Time</label>
              <Input
                type="text"
                placeholder="e.g. 6:30 PM"
                value={formData.doorsOpenTime || ''}
                onChange={(e) => setFormData({ ...formData, doorsOpenTime: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label">Event Graphic / Flyer Image</label>
            <div className="flex items-center gap-4">
              <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                {graphicPreviewUrl ? (
                  <img
                    src={graphicPreviewUrl}
                    alt="Event flyer preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <svg
                    className="size-8 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.9 2.9m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375 0 01.75 0z"
                    />
                  </svg>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="bg-primary-light text-primary-deep hover:bg-primary-deep/10 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-4 font-sans text-xs font-semibold transition-colors active:translate-y-px">
                    <span aria-hidden="true">⬆️</span>
                    <span>{graphicPreviewUrl ? 'Replace Image' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          setEventGraphicFile(file);
                          setIsGraphicRemoved(false);
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  {(eventGraphicFile || (initialData?.eventGraphic && !isGraphicRemoved)) && (
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => {
                        setEventGraphicFile(null);
                        setIsGraphicRemoved(true);
                      }}
                    >
                      Remove Image
                    </Button>
                  )}
                </div>
                <span className="text-text-muted text-[10px]">JPG, PNG, or WebP. Max 5MB.</span>
                {initialData?.eventGraphic && !isGraphicRemoved && !eventGraphicFile && (
                  <span
                    className="text-text-muted block truncate text-xs font-medium"
                    title={initialData.eventGraphic}
                  >
                    Current file: {initialData.eventGraphic.replace(/^[a-zA-Z0-9]+_/, '')}
                  </span>
                )}
                {eventGraphicFile && (
                  <span
                    className="text-primary block truncate text-xs font-medium"
                    title={eventGraphicFile.name}
                  >
                    New file: {eventGraphicFile.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label">Public Details (HTML / Text)</label>
            <Textarea
              placeholder="Describe the concert program, parking info, dress code, etc."
              value={formData.publicDetails || ''}
              onChange={(e) => setFormData({ ...formData, publicDetails: e.target.value })}
              className="min-h-[120px]"
            />
          </div>
        </div>
      )}
    </>
  );
};
