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
import { Button, Input, Select, FormField, Badge } from '../../components/ui';

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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Patrons Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          View lifetime value and message your donors and ticket buyers
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface px-6 py-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Patrons
          </p>
          <p className="mt-2 text-3xl font-bold text-text">
            {filteredStats.count}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface px-6 py-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Total LTV
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            ${(filteredStats.totalLtvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <AppCard>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-slate-50/50 p-4">
            <div className="min-w-[200px] flex-1">
              <FormField label="Search">
                <Input
                  type="text"
                  placeholder="Search patron name or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </FormField>
            </div>

            <div className="w-full min-w-[150px] sm:w-auto">
              <FormField label="From">
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => handleSetStartDate(e.target.value)}
                />
              </FormField>
            </div>

            <div className="w-full min-w-[150px] sm:w-auto">
              <FormField label="To">
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </FormField>
            </div>

            <div className="w-full min-w-[180px] sm:w-auto">
              <FormField label="Sort">
                <Select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as 'ltv' | 'name' | 'lastDate')}
                >
                  <option value="ltv">Lifetime Value</option>
                  <option value="name">Name</option>
                  <option value="lastDate">Last Transaction</option>
                </Select>
              </FormField>
            </div>

            {(searchQuery || startDate || endDate) && (
              <Button variant="ghost" onClick={handleClearFilters} className="h-[44px]">
                Reset
              </Button>
            )}
          </div>

          <div className="flex justify-start">
            <Button
              onClick={handleSendMessage}
              disabled={selectedIds.size === 0}
              variant="primary"
            >
              Send Message ({selectedIds.size})
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="w-12 px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      className="cursor-pointer rounded border-slate-300 text-primary focus:ring-primary/25"
                      checked={filteredPatrons.length > 0 && selectedIds.size === filteredPatrons.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold tracking-wide text-text-muted uppercase">
                    LTV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">
                    Last Transaction
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold tracking-wide text-text-muted uppercase">
                    Orders
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-text-muted">
                      Loading patrons...
                    </td>
                  </tr>
                ) : filteredPatrons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-text-muted">
                      No patrons found.
                    </td>
                  </tr>
                ) : (
                  filteredPatrons.map(p => (
                    <tr 
                      key={p.profile.id} 
                      className="cursor-pointer transition-colors hover:bg-slate-50/50" 
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
                      <td className="px-6 py-4 text-sm font-semibold text-text">
                        {p.profile.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-muted">
                        {p.profile.expand?.user?.email || 'No email'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge tone={p.isSinger ? 'rehearsal' : 'neutral'}>
                          {p.isSinger ? 'Singer' : 'Patron'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-emerald-700">
                        ${(p.ltvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-muted">
                        {formatInTimezone(p.lastTransactionDate, 'America/New_York', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-text-muted">
                        {p.transactionCount}
                      </td>
                    </tr>
                  ))
                )}
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
