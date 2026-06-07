import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService, type Profile, type ProfileInput } from '../../services/profileService';
import { donationService } from '../../services/donationService';
import { ticketService } from '../../services/ticketService';
import { AppCard } from '../../components/common/AppCard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { getFirstName, getLastName } from '../../lib/stringUtils';
import { SingerModal } from '../../components/admin/SingerModal';
import './PatronsView.css';

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
      return (
        p.profile.name.toLowerCase().includes(search) ||
        (p.profile.expand?.user?.email || '').toLowerCase().includes(search)
      );
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
  }, [patrons, searchQuery, sortBy]);

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
    <div className="admin-view-container patrons-view">
      <div className="admin-view-header flex-responsive">
        <div>
          <h1 className="text-display">Patrons Dashboard</h1>
          <p className="text-muted text-sm">View lifetime value and message your donors and ticket buyers.</p>
        </div>
        <div className="admin-view-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleSendMessage}
            disabled={selectedIds.size === 0}
          >
            Send Message ({selectedIds.size})
          </button>
        </div>
      </div>

      <AppCard className="patrons-filter-card">
        <div className="patrons-filters flex-responsive">
          <div className="patrons-search-wrapper">
            <input 
              type="text"
              placeholder="Search by name or email..."
              className="card patrons-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="patrons-sort-wrapper">
            <select 
              className="card patrons-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'ltv' | 'name' | 'lastDate')}
            >
              <option value="ltv">Sort by Lifetime Value</option>
              <option value="name">Sort by Name</option>
              <option value="lastDate">Sort by Last Transaction</option>
            </select>
          </div>
        </div>
      </AppCard>

      <AppCard noPadding>
        <div className="patrons-table-container">
          <table className="patrons-table w-full text-left">
            <thead>
              <tr className="patrons-table-header-row">
                <th className="patrons-table-th patrons-col-check">
                  <input 
                    type="checkbox" 
                    checked={filteredPatrons.length > 0 && selectedIds.size === filteredPatrons.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="patrons-table-th">Name</th>
                <th className="patrons-table-th">Email</th>
                <th className="patrons-table-th">Type</th>
                <th className="patrons-table-th-right">LTV</th>
                <th className="patrons-table-th">Last Transaction</th>
                <th className="patrons-table-th-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="patrons-table-td patrons-text-center">Loading patrons...</td></tr>
              ) : filteredPatrons.length === 0 ? (
                <tr><td colSpan={7} className="patrons-table-td patrons-text-center admin-empty-state">No patrons found matching your search.</td></tr>
              ) : filteredPatrons.map(p => (
                <tr key={p.profile.id} className="patrons-table-row" onClick={() => handleOpenProfile(p.profile)}>
                  <td className="patrons-table-td patrons-col-check" onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(p.profile.id)}
                      onChange={() => toggleSelect(p.profile.id)}
                    />
                  </td>
                  <td className="patrons-table-td-bold">{p.profile.name}</td>
                  <td className="patrons-table-td text-sm text-muted">
                    {p.profile.expand?.user?.email || 'No email'}
                  </td>
                  <td className="patrons-table-td">
                    <span className={`badge ${p.isSinger ? 'badge-sage' : 'badge-ghost'}`}>
                      {p.isSinger ? 'Singer' : 'Patron'}
                    </span>
                  </td>
                  <td className="patrons-table-td-right-bold">
                    ${(p.ltvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="patrons-table-td text-sm">
                    {formatInTimezone(p.lastTransactionDate, 'America/New_York', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="patrons-table-td-right text-muted">{p.transactionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
