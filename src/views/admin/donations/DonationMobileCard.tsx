import type { DonationRecord } from '../../../services/donationService';
import { Badge, Button } from '../../../components/ui';
import { formatInTimezone } from '../../../lib/timezone';

interface DonationMobileCardProps {
  donation: DonationRecord;
  timezone: string;
  onRefund: (id: string) => void;
}

export default function DonationMobileCard({
  donation: d,
  timezone,
  onRefund,
}: DonationMobileCardProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">
          {formatInTimezone(d.created, timezone, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
        <Badge
          tone={d.status === 'paid' ? 'success' : d.status === 'refunded' ? 'danger' : 'neutral'}
        >
          {d.status}
        </Badge>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-slate-800">{d.donorName}</span>
          {d.isAnonymous && (
            <span className="inline-flex w-fit items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-slate-600 uppercase">
              Anonymous
            </span>
          )}
          <span className="text-xs font-medium break-all text-slate-500">{d.donorEmail}</span>
        </div>
        <span className="shrink-0 text-base font-extrabold text-slate-900">
          ${(d.amountPaidCents / 100).toFixed(2)}
        </span>
      </div>

      {d.tributeType !== 'none' && (
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-xs leading-relaxed text-slate-500">
          <span className="text-slate-400">
            In {d.tributeType === 'memory' ? 'Memory' : 'Honor'} of
          </span>{' '}
          <strong className="font-semibold text-slate-700">{d.tributeName}</strong>
        </div>
      )}

      {d.status === 'paid' && (
        <div className="mt-1 flex justify-end border-t border-slate-50 pt-1.5">
          <Button variant="danger" size="small" className="w-full" onClick={() => onRefund(d.id)}>
            Refund
          </Button>
        </div>
      )}
    </div>
  );
}
