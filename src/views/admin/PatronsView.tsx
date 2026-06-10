import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService, type Profile, type ProfileInput } from '../../services/profileService';
import { donationService } from '../../services/donationService';
import { ticketService } from '../../services/ticketService';
import { AppCard } from '../../components/common/AppCard';
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
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex flex-col items-center justify-between md:flex-row">
        <div>
          <h1 className="text-display">Patrons Dashboard</h1>
          <p className="text-muted text-sm">View lifetime value and message your donors and ticket buyers.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="btn btn-primary" 
            onClick={handleSendMessage}
            disabled={selectedIds.size === 0}
          >
            Send Message ({selectedIds.size})
          </button>
        </div>
      </div>

      <div className="card bg-bg p-4">
        <div className="flex h-full items-center justify-around">
          <div className="flex flex-col gap-1 text-center">
            <span className="text-sm font-bold tracking-wider text-text-muted uppercase">Patrons</span>
            <span className="text-headline font-bold">{filteredStats.count}</span>
          </div>
          <div className="flex flex-col gap-1 text-center">
            <span className="text-sm font-bold tracking-wider text-text-muted uppercase">Total LTV</span>
            <span className="text-headline font-bold text-primary">
              ${(filteredStats.totalLtvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <AppCard title="Patron Directory">
          <div className="flex flex-col gap-4">
          <div className="card flex flex-row flex-wrap items-end gap-4 rounded-md border border-border bg-surface p-4">
            {/* Search */}
            <div className="flex flex-[1_1_200px] flex-col gap-1.5">
              <label className="text-label text-xs font-bold text-text-muted uppercase">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Name or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="card h-10 w-full rounded-md border border-border py-2 pr-8 pl-9 text-sm"
                />
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-text-muted hover:bg-black/5"
                    title="Clear search"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Start Date */}
            <div className="flex w-[170px] flex-col gap-1.5">
              <label className="text-label text-xs font-bold text-text-muted uppercase">From</label>
              <input
                type="date"
                value={startDate}
                onChange={e => handleSetStartDate(e.target.value)}
                className="card h-10 w-full cursor-pointer rounded-md border border-border px-3 text-sm"
              />
            </div>

            {/* End Date */}
            <div className="flex w-[170px] flex-col gap-1.5">
              <label className="text-label text-xs font-bold text-text-muted uppercase">To</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="card h-10 w-full cursor-pointer rounded-md border border-border px-3 text-sm"
              />
            </div>

            {/* Sort */}
            <div className="flex w-[200px] flex-col gap-1.5">
              <label className="text-label text-xs font-bold text-text-muted uppercase">Sort By</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'ltv' | 'name' | 'lastDate')}
                className="card h-10 w-full cursor-pointer rounded-md border border-border px-3 text-sm"
              >
                <option value="ltv">Lifetime Value</option>
                <option value="name">Name</option>
                <option value="lastDate">Last Transaction</option>
              </select>
            </div>

            {/* Reset */}
            {(searchQuery || startDate || endDate) && (
              <button
                onClick={handleClearFilters}
                className="btn btn-ghost !h-10 self-end px-2 text-[0.85rem] font-bold text-[#ef4444]"
              >
                Clear Filters
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-border text-sm text-text-muted">
                <th className="w-12 p-3 text-center">
                  <input 
                    type="checkbox" 
                    checked={filteredPatrons.length > 0 && selectedIds.size === filteredPatrons.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-right">LTV</th>
                <th className="p-3 text-left">Last Transaction</th>
                <th className="p-3 text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center">Loading patrons...</td></tr>
              ) : filteredPatrons.length === 0 ? (
                <tr><td colSpan={7} className="flex flex-col items-center justify-center p-8 py-12 text-center text-text-muted">No patrons found matching your search.</td></tr>
              ) : filteredPatrons.map(p => (
                <tr key={p.profile.id} className="cursor-pointer border-b border-border text-sm hover:bg-primary-light" onClick={() => handleOpenProfile(p.profile)}>
                  <td className="w-12 p-3 text-center" onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(p.profile.id)}
                      onChange={() => toggleSelect(p.profile.id)}
                    />
                  </td>
                  <td className="p-3 font-semibold">{p.profile.name}</td>
                  <td className="text-muted p-3 text-sm">
                    {p.profile.expand?.user?.email || 'No email'}
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase ${p.isSinger ? 'bg-[#e6fffa] text-[#2c7a7b]' : 'bg-transparent text-text-muted'}`}>
                      {p.isSinger ? 'Singer' : 'Patron'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-primary">
                    ${(p.ltvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-sm">
                    {formatInTimezone(p.lastTransactionDate, 'America/New_York', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="text-muted p-3 text-right">{p.transactionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
