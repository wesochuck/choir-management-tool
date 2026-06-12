import React from 'react';
import type { Profile } from '../../services/profileService';
import type { EventRoster } from '../../services/rosterService';
import { pb } from '../../lib/pocketbase';
import { PhotoUploader } from '../common/PhotoUploader';
import { Badge } from '../ui';
import { getRsvpDisplay } from '../../lib/statusDisplay';


interface EventRosterTableProps {
  singers: Array<{
    profile: Profile;
    rsvp: 'Yes' | 'No' | 'Pending';
    roster?: EventRoster;
  }>;
  isUpdating: boolean;
  onUpdateRSVP: (profileId: string, nextRsvp: 'Yes' | 'No' | 'Pending') => Promise<void>;
  onPhotoChange?: () => void;
  onSingerClick?: (profile: Profile) => void;
  missCounts?: Record<string, number>;
  maxRehearsalMisses?: number;
}

export const EventRosterTable: React.FC<EventRosterTableProps> = ({
  singers,
  isUpdating,
  onUpdateRSVP,
  onPhotoChange,
  onSingerClick,
  missCounts,
  maxRehearsalMisses,
}) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Voice
            </th>
            <th className="px-6 py-3 text-center text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Missed Rehearsals
            </th>
            <th className="px-6 py-3 text-center text-xs font-semibold tracking-wide text-slate-500 uppercase">
              RSVP Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {singers.map((s) => {
            const p = s.profile;
            const rsvpDisplay = getRsvpDisplay(s.rsvp, { variant: 'eventRoster' });
            return (
              <tr
                key={p.id}
                className="hover:bg-slate-50"
              >
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <PhotoUploader
                      profileId={p.id}
                      profileName={p.name}
                      currentPhotoUrl={p.photo ? pb.files.getURL(p, p.photo) : undefined}
                      size="sm"
                      onSuccess={onPhotoChange}
                      readOnlyOnDesktop={true}
                    />
                    {onSingerClick ? (
                      <button
                        type="button"
                        onClick={() => onSingerClick(p)}
                        className="m-0 cursor-pointer border-0 bg-transparent p-0 text-left font-medium text-emerald-700 transition-colors duration-150 hover:text-emerald-800 hover:underline"
                      >
                        {p.name}
                      </button>
                    ) : (
                      <span className="font-medium text-slate-800">{p.name}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  <span className="font-semibold text-emerald-700">{p.voicePart || '--'}</span>
                </td>
                <td className="px-6 py-4 text-center text-sm whitespace-nowrap">
                  {missCounts && missCounts[p.id] !== undefined && missCounts[p.id] > 0 ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        missCounts[p.id] > (maxRehearsalMisses ?? 3)
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      ⚠️ {missCounts[p.id]} missed
                    </span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center text-sm whitespace-nowrap">
                  <div className="flex flex-col items-center gap-1">
                    <Badge
                      label={rsvpDisplay.label}
                      tone={rsvpDisplay.tone}
                      size="sm"
                    />
                    {s.roster?.rsvpNote && s.rsvp === 'No' && (
                      <div className="max-w-[160px] text-xs leading-tight font-normal text-slate-400 italic">
                        &quot;{s.roster.rsvpNote}&quot;
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onUpdateRSVP(p.id, 'Yes')}
                      className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                        s.rsvp === 'Yes'
                          ? 'bg-emerald-700 text-white'
                          : 'border border-slate-300 text-slate-500 hover:bg-slate-50'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      Attending
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onUpdateRSVP(p.id, 'No')}
                      className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                        s.rsvp === 'No'
                          ? 'bg-red-600 text-white'
                          : 'border border-slate-300 text-slate-500 hover:bg-slate-50'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      Declined
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onUpdateRSVP(p.id, 'Pending')}
                      className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                        s.rsvp === 'Pending'
                          ? 'bg-slate-500 text-white'
                          : 'border border-slate-300 text-slate-500 hover:bg-slate-50'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      Reset
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {singers.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">No singers found.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
