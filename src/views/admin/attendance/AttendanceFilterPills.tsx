interface AttendanceFilterPillsProps {
  filter: 'All' | 'Present' | 'Absent' | 'Unmarked';
  setFilter: (f: 'All' | 'Present' | 'Absent' | 'Unmarked') => void;
}

export function AttendanceFilterPills({ filter, setFilter }: AttendanceFilterPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-2">
      {(['All', 'Present', 'Absent', 'Unmarked'] as const).map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => setFilter(f)}
          className={`h-7 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors ${
            filter === f
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-400'
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
