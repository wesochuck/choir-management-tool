import type { DeliverySummary, FailureCategory } from '../../../services/communicationService';

interface DeliverySummaryPanelProps {
  summary: DeliverySummary;
}

const CATEGORY_LABELS: Record<FailureCategory, string> = {
  authentication: 'Authentication failed',
  'rate-limit': 'Rate limited',
  'invalid-destination': 'Invalid destination',
  'provider-rejected': 'Provider rejected',
  timeout: 'Request timed out',
  unknown: 'Unknown failure',
};

export function DeliverySummaryPanel({ summary }: DeliverySummaryPanelProps) {
  const { total, email, sms, failures, hasMoreFailures, truncated, lastActivity } = summary;

  if (truncated) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Tracking is unavailable for this unusually large message.
      </div>
    );
  }

  return (
    <div className="border-border flex flex-col gap-4 border-t pt-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="border-border border-r">
          <div className="text-text text-2xl font-bold">{total.total}</div>
          <div className="text-text-muted text-xs">Total Enqueued</div>
        </div>
        <div className="border-border border-r">
          <div className="text-success-text text-2xl font-bold">{total.sent}</div>
          <div className="text-text-muted text-xs">Sent</div>
        </div>
        <div>
          <div className="text-danger-text text-2xl font-bold">{total.failed}</div>
          <div className="text-text-muted text-xs">Failed</div>
        </div>
      </div>

      <div className="bg-surface-muted grid grid-cols-2 gap-4 rounded-lg p-3 text-sm">
        <div>
          <div className="text-text mb-1 font-semibold">Email Channel</div>
          <ul className="text-text-muted space-y-0.5 text-xs">
            <li>Total: {email.total}</li>
            <li>Sent: {email.sent}</li>
            <li>Failed: {email.failed}</li>
            <li>Pending/Processing: {email.pending + email.processing}</li>
          </ul>
        </div>
        <div>
          <div className="text-text mb-1 font-semibold">SMS Channel</div>
          <ul className="text-text-muted space-y-0.5 text-xs">
            <li>Total: {sms.total}</li>
            <li>Sent: {sms.sent}</li>
            <li>Failed: {sms.failed}</li>
            <li>Pending/Processing: {sms.pending + sms.processing}</li>
          </ul>
        </div>
      </div>

      {lastActivity && (
        <div className="text-text-muted text-xs">
          Last Activity: {new Date(lastActivity).toLocaleString()}
        </div>
      )}

      {failures.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-text text-sm font-semibold">Failed Deliveries</div>
          <div className="divide-border max-h-48 divide-y overflow-y-auto rounded-lg">
            {failures.map((failure, idx) => (
              <div key={idx} className="flex items-start justify-between gap-4 p-3 text-xs">
                <div>
                  <div className="text-text font-semibold">{failure.maskedDestination}</div>
                  <div className="text-text-muted mt-0.5">
                    Channel: <span className="uppercase">{failure.channel}</span> · Attempts:{' '}
                    {failure.attempts}
                  </div>
                </div>
                <div className="bg-danger-bg text-danger-text rounded px-1.5 py-0.5 font-medium whitespace-nowrap">
                  {CATEGORY_LABELS[failure.category] || failure.category}
                </div>
              </div>
            ))}
          </div>
          {hasMoreFailures && (
            <div className="text-text-muted text-xs italic">Additional failures are not shown.</div>
          )}
        </div>
      )}
    </div>
  );
}
