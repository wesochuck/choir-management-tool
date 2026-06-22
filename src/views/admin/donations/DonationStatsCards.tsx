interface DonationStatsCardsProps {
  count: number;
  totalCents: number;
  avgCents: number;
}

export default function DonationStatsCards({
  count,
  totalCents,
  avgCents,
}: DonationStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="absolute top-0 left-0 h-1.5 w-full bg-slate-400 transition-colors group-hover:bg-slate-500" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Donations Count
            </p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{count}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-slate-500 transition-colors group-hover:bg-slate-100">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-2xl border border-pink-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="absolute top-0 left-0 h-1.5 w-full bg-pink-500 transition-colors group-hover:bg-pink-600" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-wider text-pink-500 uppercase">Total Raised</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-pink-600">
              ${(totalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-xl bg-pink-50 p-3 text-pink-500 transition-colors group-hover:bg-pink-100/80">
            <span aria-hidden="true">💵</span>
          </div>
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="absolute top-0 left-0 h-1.5 w-full bg-emerald-500 transition-colors group-hover:bg-emerald-600" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-wider text-emerald-600 uppercase">
              Average Gift
            </p>
            <p className="mt-2 text-3xl font-black tracking-tight text-emerald-800">
              ${(avgCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 transition-colors group-hover:bg-emerald-100/80">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
