import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService, type Profile, type ProfileInput } from '../../services/profileService';
import { donationService } from '../../services/donationService';
import { ticketService } from '../../services/ticketService';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { getFirstName, getLastName } from '../../lib/stringUtils';
import { safeLocalStorage } from '../../lib/storage';
import { SingerModal } from '../../components/admin/SingerModal';
import { AppCard } from '../../components/common/AppCard';
import { Button, FormField, Badge, EmptyState } from '../../components/ui';

const STORAGE_KEY_START_DATE = 'patrons_view_filter_start_date';

interface PatronData {
  profile: Profile;
  ltvCents: number;
  lastTransactionDate: string;
  transactionCount: number;
  isSinger: boolean;
}

export default function PatronsView() {
  useDocumentTitle('Patrons');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patrons, setPatrons] = useState<PatronData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'ltv' | 'name' | 'lastDate'>('ltv');
  const [startDate, setStartDate] = useState(safeLocalStorage.getItem(STORAGE_KEY_START_DATE) || '');
  const [endDate, setEndDate] = useState('');

  const handleSetStartDate = (val: string) => {
    setStartDate(val);
    if (val) {
      safeLocalStorage.setItem(STORAGE_KEY_START_DATE, val);
    } else {
      safeLocalStorage.removeItem(STORAGE_KEY_START_DATE);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    safeLocalStorage.removeItem(STORAGE_KEY_START_DATE);
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatron, setSelectedPatron] = useState<Profile | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profiles, donations, purchases] = await Promise.all([
        profileService.getProfiles(),
        donationService.getDonations('status = "paid"'),
        ticketService.getAllPurchases()
      ]);

      const paidPurchases = purchases.filter(p => p.status === 'paid');

      // Map profiles to their transactions
      const patronMap = new Map<string, PatronData>();

      const processTransaction = (profileId: string | undefined, amountCents: number, date: string) => {
        if (!profileId) return;
        const profile = profiles.find(p => p.id === profileId);
        if (!profile) return;

        const existing = patronMap.get(profileId);
        if (existing) {
          existing.ltvCents += amountCents;
          existing.transactionCount += 1;
          if (new Date(date) > new Date(existing.lastTransactionDate)) {
            existing.lastTransactionDate = date;
          }
        } else {
          patronMap.set(profileId, {
            profile,
            ltvCents: amountCents,
            lastTransactionDate: date,
            transactionCount: 1,
            isSinger: !!profile.voicePart
          });
        }
      };

      donations.forEach(d => processTransaction(d.profile, d.amountPaidCents, d.created));
      paidPurchases.forEach(p => processTransaction(p.profile, p.amountPaidCents, p.created));

      setPatrons(Array.from(patronMap.values()));
    } catch (err) {
      console.error('Failed to fetch patrons data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPatrons = useMemo(() => {
    const result = patrons.filter(p => {
      const search = searchQuery.toLowerCase();
      const matchesSearch =
        p.profile.name.toLowerCase().includes(search) ||
        (p.profile.expand?.user?.email || '').toLowerCase().includes(search);

      const date = new Date(p.lastTransactionDate);
      const matchesStart = !startDate || date >= new Date(startDate);
      const matchesEnd = !endDate || date <= new Date(endDate + 'T23:59:59');

      return matchesSearch && matchesStart && matchesEnd;
    });

    result.sort((a, b) => {
      if (sortBy === 'ltv') return b.ltvCents - a.ltvCents;
      if (sortBy === 'name') {
        const lastA = getLastName(a.profile.name).toLowerCase();
        const lastB = getLastName(b.profile.name).toLowerCase();
        if (lastA !== lastB) return lastA.localeCompare(lastB);
        return getFirstName(a.profile.name).localeCompare(getFirstName(b.profile.name));
      }
      if (sortBy === 'lastDate') {
        return new Date(b.lastTransactionDate).getTime() - new Date(a.lastTransactionDate).getTime();
      }
      return 0;
    });

    return result;
  }, [patrons, searchQuery, sortBy, startDate, endDate]);

  const filteredStats = useMemo(() => {
    const count = filteredPatrons.length;
    const totalLtvCents = filteredPatrons.reduce((acc, p) => acc + p.ltvCents, 0);
    return { count, totalLtvCents };
  }, [filteredPatrons]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPatrons.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPatrons.map(p => p.profile.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSendMessage = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds).join(',');
    navigate(`/admin/communications?recipientIds=${ids}`);
  };

  const handleOpenProfile = (profile: Profile) => {
    setSelectedPatron(profile);
    setIsModalOpen(true);
  };

  const handleSaveProfile = async (data: ProfileInput) => {
    if (selectedPatron) {
      await profileService.updateProfile(selectedPatron.id, data);
      await fetchData();
    }
  };

  const handleDeleteProfile = async (profile: Profile) => {
    await profileService.deleteProfile(profile.id);
    await fetchData();
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header Area */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Patrons Dashboard
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
          View lifetime value and message your donors and ticket buyers
        </p>
      </div>

      {/* Stats Analytics Dashboard */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Patrons Count Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-slate-400 group-hover:bg-slate-500 transition-colors" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Patrons Count
              </p>
              <p className="mt-2 text-3xl font-black text-slate-900 tracking-tight">
                {filteredStats.count}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-slate-500 group-hover:bg-slate-100 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total LTV Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-pink-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-pink-500 group-hover:bg-pink-600 transition-colors" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-pink-500">
                Total Lifetime Value
              </p>
              <p className="mt-2 text-3xl font-black text-pink-600 tracking-tight">
                ${(filteredStats.totalLtvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl bg-pink-50 p-3 text-pink-500 group-hover:bg-pink-100/80 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <AppCard noPadding>
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-800">Patrons Register</h3>
        </div>
        <div className="flex flex-col gap-4 p-6">
          {/* Filter deck */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="md:col-span-1">
              <FormField label="Search">
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 text-slate-400" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                  <input 
                    type="text" 
                    placeholder="Search patron name or email..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </FormField>
            </div>
            <div className="md:col-span-2 flex flex-row gap-4">
              <div className="flex-1 min-w-0">
                <FormField label="From Date">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={e => handleSetStartDate(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </FormField>
              </div>
              <div className="flex-1 min-w-0">
                <FormField label="To Date">
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </FormField>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormField label="Sort By">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as 'ltv' | 'name' | 'lastDate')}
                    className="block w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="ltv">Lifetime Value</option>
                    <option value="name">Name</option>
                    <option value="lastDate">Last Transaction</option>
                  </select>
                </FormField>
              </div>
              {(searchQuery || startDate || endDate) && (
                <Button 
                  variant="outline" 
                  onClick={handleClearFilters}
                  className="h-10 px-3 flex items-center justify-center font-semibold"
                  title="Reset filters"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </Button>
              )}
            </div>
          </div>

          <div className="w-full flex flex-row items-center justify-between border-b border-slate-200 pb-px">
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <span className="text-sm text-slate-500 font-medium">
                  {selectedIds.size} patron{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 pb-1.5">
              <Button
                variant="primary"
                className="px-3 md:px-6 font-semibold shadow-sm"
                onClick={handleSendMessage}
                disabled={selectedIds.size === 0}
                title="Send Message"
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                }
              >
                <span className="hidden md:inline">Send Message</span>
                {selectedIds.size > 0 && <span className="ml-1">({selectedIds.size})</span>}
              </Button>
            </div>
          </div>

          {/* Responsive Register View - Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/75">
                <tr>
                  <th className="w-12 px-6 py-3.5 text-left">
                    <input
                      type="checkbox"
                      className="cursor-pointer rounded border-slate-300 text-primary focus:ring-primary/25"
                      checked={filteredPatrons.length > 0 && selectedIds.size === filteredPatrons.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Email</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Type</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">LTV</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Last Transaction</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                        Loading patrons...
                      </div>
                    </td>
                  </tr>
                ) : filteredPatrons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <EmptyState
                        title="No Patrons Found"
                        description={
                          searchQuery || startDate || endDate
                            ? "No patrons match your search/filter criteria."
                            : "No patron records are available yet."
                        }
                        icon="👥"
                        action={
                          (searchQuery || startDate || endDate) ? (
                            <Button variant="secondary" onClick={handleClearFilters} size="small">
                              Reset Filters
                            </Button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredPatrons.map(p => (
                    <tr 
                      key={p.profile.id} 
                      className="cursor-pointer transition-colors hover:bg-slate-50/40" 
                      onClick={() => handleOpenProfile(p.profile)}
                    >
                      <td className="w-12 px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="cursor-pointer rounded border-slate-300 text-primary focus:ring-primary/25"
                          checked={selectedIds.has(p.profile.id)}
                          onChange={() => toggleSelect(p.profile.id)}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                        {p.profile.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                        {p.profile.expand?.user?.email || 'No email'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge tone={p.isSinger ? 'rehearsal' : 'neutral'}>
                          {p.isSinger ? 'Singer' : 'Patron'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-extrabold text-emerald-700 whitespace-nowrap">
                        ${(p.ltvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                        {formatInTimezone(p.lastTransactionDate, 'America/New_York', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-500 font-medium">
                        {p.transactionCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Responsive Register View - Mobile Card List */}
          <div className="md:hidden bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-6 text-center text-sm text-slate-400 font-medium flex flex-col items-center justify-center gap-2">
                  <span className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                  Loading patrons...
                </div>
              ) : filteredPatrons.length === 0 ? (
                <div className="p-6 text-center">
                  <EmptyState
                    title="No Patrons Found"
                    description={
                      searchQuery || startDate || endDate
                        ? "No patrons match your search/filter criteria."
                        : "No patron records are available yet."
                    }
                    icon="👥"
                    action={
                      (searchQuery || startDate || endDate) ? (
                        <Button variant="secondary" onClick={handleClearFilters} size="small">
                          Reset Filters
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                filteredPatrons.map(p => (
                  <div 
                    key={p.profile.id} 
                    className="p-4 flex flex-col gap-3 transition-colors hover:bg-slate-50/40 cursor-pointer"
                    onClick={() => handleOpenProfile(p.profile)}
                  >
                    {/* Row 1: Checkbox & Type Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="cursor-pointer rounded border-slate-300 text-primary focus:ring-primary/25"
                          checked={selectedIds.has(p.profile.id)}
                          onChange={() => toggleSelect(p.profile.id)}
                        />
                        <span className="text-xs text-slate-400 font-medium">
                          Last: {formatInTimezone(p.lastTransactionDate, 'America/New_York', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <Badge tone={p.isSinger ? 'rehearsal' : 'neutral'}>
                        {p.isSinger ? 'Singer' : 'Patron'}
                      </Badge>
                    </div>

                    {/* Row 2: Patron Info & LTV Amount */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-slate-800">{p.profile.name}</span>
                        <span className="text-xs text-slate-500 font-medium break-all">
                          {p.profile.expand?.user?.email || 'No email'}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-base font-extrabold text-emerald-700">
                          ${(p.ltvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {p.transactionCount} order{p.transactionCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </AppCard>

      <SingerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProfile}
        onDelete={handleDeleteProfile}
        initialData={selectedPatron}
      />
    </div>
  );
}
