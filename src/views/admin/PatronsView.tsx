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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex flex-col md:flex-row">
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

      <div className="card p-4 bg-bg">
        <div className="flex justify-around h-full items-center">
          <div className="flex flex-col gap-1 text-center">
            <span className="text-sm text-text-muted font-bold uppercase tracking-wider">Patrons</span>
            <span className="text-headline font-bold">{filteredStats.count}</span>
          </div>
          <div className="flex flex-col gap-1 text-center">
            <span className="text-sm text-text-muted font-bold uppercase tracking-wider">Total LTV</span>
            <span className="text-headline font-bold text-primary">
              ${(filteredStats.totalLtvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <AppCard title="Patron Directory">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-center w-full flex-wrap max-md:flex-col max-md:items-stretch">
            <div className="flex-1 min-w-[200px] w-full">
              <input 
                type="text"
                placeholder="Search by name or email..."
                className="card w-full px-3 h-10 border border-border"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <input 
                type="date" 
                className="card w-full px-3 h-10 border border-border cursor-pointer"
                value={startDate}
                onChange={e => handleSetStartDate(e.target.value)}
                placeholder="Last Transaction From"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <input 
                type="date" 
                className="card w-full px-3 h-10 border border-border cursor-pointer"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                placeholder="To"
              />
            </div>
            <div className="min-w-[200px]">
              <select 
                className="card w-full px-3 h-10 border border-border cursor-pointer"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'ltv' | 'name' | 'lastDate')}
              >
                <option value="ltv">Sort by Lifetime Value</option>
                <option value="name">Sort by Name</option>
                <option value="lastDate">Sort by Last Transaction</option>
              </select>
            </div>
            <button className="btn btn-ghost h-10 min-h-10" onClick={handleClearFilters}>
              Reset
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="border-collapse w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b-2 border-border text-text-muted text-sm">
                <th className="p-3 w-12 text-center">
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
                <tr><td colSpan={7} className="text-center p-8">Loading patrons...</td></tr>
              ) : filteredPatrons.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-8 flex flex-col items-center justify-center py-12 text-text-muted">No patrons found matching your search.</td></tr>
              ) : filteredPatrons.map(p => (
                <tr key={p.profile.id} className="border-b border-border text-sm cursor-pointer hover:bg-primary-light" onClick={() => handleOpenProfile(p.profile)}>
                  <td className="p-3 w-12 text-center" onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(p.profile.id)}
                      onChange={() => toggleSelect(p.profile.id)}
                    />
                  </td>
                  <td className="p-3 font-semibold">{p.profile.name}</td>
                  <td className="p-3 text-sm text-muted">
                    {p.profile.expand?.user?.email || 'No email'}
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${p.isSinger ? 'bg-[#e6fffa] text-[#2c7a7b]' : 'bg-transparent text-text-muted'}`}>
                      {p.isSinger ? 'Singer' : 'Patron'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-primary">
                    ${(p.ltvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-sm">
                    {formatInTimezone(p.lastTransactionDate, 'America/New_York', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="p-3 text-right text-muted">{p.transactionCount}</td>
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
