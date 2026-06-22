import type { DonationLevel } from '../../../services/donationService';
import { Button, EmptyState } from '../../../components/ui';

interface DonorLevelGridProps {
  levels: DonationLevel[];
  onEdit: (level: DonationLevel) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export default function DonorLevelGrid({ levels, onEdit, onDelete, onAdd }: DonorLevelGridProps) {
  return (
    <div className="flex flex-col gap-6 lg:col-span-2">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-2xl border border-pink-100 bg-pink-50/30 p-5 shadow-sm">
          <div className="shrink-0 rounded-xl bg-pink-100 p-2.5 text-pink-600">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-extrabold text-pink-800">Donor Levels</h3>
            <p className="mt-1 text-sm leading-relaxed font-medium text-slate-600">
              These levels are displayed to donors on the public donation checkout page to encourage
              higher donation amounts by highlighting tier benefits.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {levels.length === 0 ? (
            <div className="col-span-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <EmptyState
                title="No Donor Levels Configured"
                description="Create recognition tiers to prompt donors with suggesting amounts."
                icon="🌟"
                action={
                  <Button variant="primary" size="small" onClick={onAdd}>
                    + Create First Level
                  </Button>
                }
              />
            </div>
          ) : (
            levels.map((l) => (
              <div
                key={l.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="truncate text-base font-extrabold text-slate-900">{l.label}</h4>
                    <span className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700 ring-1 ring-emerald-600/10">
                      ${l.amount.toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-3 min-h-[48px] border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      Benefit & Perks
                    </span>
                    <p className="mt-1 text-sm leading-relaxed font-medium text-slate-600">
                      {l.benefit ? (
                        l.benefit
                      ) : (
                        <span className="text-slate-300 italic">No benefit specified</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-50 pt-3 opacity-100 transition-opacity duration-150 group-hover:opacity-100 sm:opacity-0">
                  <Button variant="outline" size="small" className="h-8" onClick={() => onEdit(l)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    className="h-8"
                    onClick={() => onDelete(l.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
