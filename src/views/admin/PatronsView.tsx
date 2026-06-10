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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-800">
          Patrons Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          View lifetime value and message your donors and ticket buyers.
        </p>
        <button
          onClick={handleSendMessage}
          disabled={selectedIds.size === 0}
          className="mt-4 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          Send Message ({selectedIds.size})
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Patrons
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-800">
            {filteredStats.count}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total LTV
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">
            ${(filteredStats.totalLtvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Patron Directory
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search, filter, and sort patrons by activity and lifetime value.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Search
                </span>
                <input
                  type="search"
                  placeholder="Name or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  From
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => handleSetStartDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  To
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sort
                </span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as 'ltv' | 'name' | 'lastDate')}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                >
                  <option value="ltv">Lifetime Value</option>
                  <option value="name">Name</option>
                  <option value="lastDate">Last Transaction</option>
                </select>
              </label>

              {(searchQuery || startDate || endDate) && (
                <button
                  onClick={handleClearFilters}
                  className="self-end rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 sm:col-span-2 lg:col-span-1"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-700">Loading patrons...</p>
            </div>
          ) : filteredPatrons.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-700">No patrons found</p>
              <p className="mt-1 text-sm text-slate-500">
                Try adjusting your search or date filters.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-12 px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={filteredPatrons.length > 0 && selectedIds.size === filteredPatrons.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    LTV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Last Transaction
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Orders
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredPatrons.map(p => (
                  <tr key={p.profile.id} className="cursor-pointer hover:bg-slate-50" onClick={() => handleOpenProfile(p.profile)}>
                    <td className="w-12 px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={selectedIds.has(p.profile.id)}
                        onChange={() => toggleSelect(p.profile.id)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-800">
                      {p.profile.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {p.profile.expand?.user?.email || 'No email'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${p.isSinger ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {p.isSinger ? 'Singer' : 'Patron'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-emerald-700">
                      ${(p.ltvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {formatInTimezone(p.lastTransactionDate, 'America/New_York', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-slate-500">
                      {p.transactionCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

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
