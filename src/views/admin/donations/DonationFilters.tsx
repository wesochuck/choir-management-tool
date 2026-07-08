import { FormField, Input, Select, Button } from '../../../components/ui';

interface DonationFiltersProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  sortBy: string;
  onSortChange: (val: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export default function DonationFilters({
  searchQuery,
  onSearchChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  sortBy,
  onSortChange,
  onClearFilters,
  hasActiveFilters,
}: DonationFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 md:grid-cols-4">
      <div className="md:col-span-1">
        <FormField label="Search">
          <Input
            placeholder="Donor name or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          >
            <svg
              slot="prefix"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-400"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Input>
        </FormField>
      </div>
      <div className="flex flex-row gap-4 md:col-span-2">
        <div className="min-w-0 flex-1">
          <FormField label="From Date">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </FormField>
        </div>
        <div className="min-w-0 flex-1">
          <FormField label="To Date">
            <Input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} />
          </FormField>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <FormField label="Sort By">
            <Select value={sortBy} onChange={(e) => onSortChange(e.target.value)}>
              <option value="date">Date (Newest First)</option>
              <option value="amount">Amount (Highest First)</option>
              <option value="name">Donor Name</option>
            </Select>
          </FormField>
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="h-10 shrink-0 self-end"
            title="Reset filters"
            icon="🔄"
          />
        )}
      </div>
    </div>
  );
}
