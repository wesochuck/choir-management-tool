import React from 'react';
import type { ValidationResult } from '../../services/ticketService';

interface ScanResultCardProps {
  result: ValidationResult;
}

const REASON_MESSAGES: Record<string, string> = {
  malformed: 'QR code is not valid',
  bad_signature: 'QR code is not valid',
  not_found: 'Ticket not found',
  not_paid: 'Ticket has been refunded',
  wrong_event: 'This ticket is for a different concert',
};

export const ScanResultCard: React.FC<ScanResultCardProps> = ({ result }) => {
  if (result.valid) {
    return (
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 shadow-md">
        <div className="mb-3 flex items-center gap-3">
          <span className="text-3xl">{'\u2713'}</span>
          <h2 className="m-0 text-xl font-bold text-emerald-800">Valid Ticket</h2>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-emerald-700">Event:</span>
            <strong className="text-emerald-900">{result.eventTitle}</strong>
          </div>
          {result.eventDate && (
            <div className="flex justify-between">
              <span className="text-emerald-700">Date:</span>
              <strong className="text-emerald-900">
                {new Date(result.eventDate).toLocaleString()}
              </strong>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-emerald-700">Will Call:</span>
            <strong className="text-emerald-900">{result.buyerName}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-700">Quantity:</span>
            <strong className="text-emerald-900">
              {result.quantity} {result.isBundlePass ? 'Season Pass' : 'ticket'}
              {(result.quantity ?? 0) > 1 ? (result.isBundlePass ? 'es' : 's') : ''}
            </strong>
          </div>
        </div>
        {result.isBundlePass && result.bundleTitle && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3">
            <p className="m-0 text-xs font-bold uppercase text-emerald-700">Season Pass</p>
            <p className="m-0 mt-1 text-sm font-semibold text-emerald-900">{result.bundleTitle}</p>
            {result.bundleEvents && result.bundleEvents.length > 0 && (
              <p className="m-0 mt-1 text-xs text-emerald-600">
                Also valid at: {result.bundleEvents.map(ev => ev.title).join(', ')}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  const message = REASON_MESSAGES[result.reason || ''] || 'Invalid ticket';

  return (
    <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-6 shadow-md">
      <div className="mb-2 flex items-center gap-3">
        <span className="text-3xl">{'\u2717'}</span>
        <h2 className="m-0 text-xl font-bold text-rose-800">Invalid</h2>
      </div>
      <p className="m-0 text-sm text-rose-700">{message}</p>
    </div>
  );
};
