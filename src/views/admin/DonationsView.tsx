import { useCallback, useEffect, useMemo, useState } from 'react';
import { donationService, type DonationRecord, type DonationLevel, type DonationSettings, DEFAULT_DONATION_SETTINGS } from '../../services/donationService';
import { settingsService } from '../../services/settingsService';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { BaseModal } from '../../components/common/BaseModal';
import { formatInTimezone } from '../../lib/timezone';
import { safeLocalStorage } from '../../lib/storage';
import { getFirstName, getLastName } from '../../lib/stringUtils';

const STORAGE_KEY_START_DATE = 'donations_view_filter_start_date';

export default function DonationsView() {
  useDocumentTitle('Donations');
  const dialog = useDialog();
  const [activeTab, setActiveTab] = useState<'history' | 'levels'>('history');

  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [settings, setSettings] = useState<DonationSettings | null>(null);
  const [timezone, setTimezone] = useState('America/New_York');
  const [loading, setLoading] = useState(true);
  const [donationButtonText, setDonationButtonText] = useState('');
  const [donationDescription, setDonationDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(safeLocalStorage.getItem(STORAGE_KEY_START_DATE) || '');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'amount' | 'name' | 'date'>('date');

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

  // Level CRUD modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<DonationLevel | null>(null);
  const [levelLabel, setLevelLabel] = useState('');
  const [levelAmount, setLevelAmount] = useState(0);
  const [levelBenefit, setLevelBenefit] = useState('');
  const [saving, setSaving] = useState(false);

  const reloadData = useCallback(async () => {
    setLoading(true);
    try {
      const [donationsRes, settingsRes, timezoneRes] = await Promise.all([
        donationService.getDonations(),
        donationService.getDonationSettings(),
        settingsService.getTimezone()
      ]);
      setDonations(donationsRes);
      setSettings(settingsRes);
      setDonationButtonText(settingsRes.buttonText ?? DEFAULT_DONATION_SETTINGS.buttonText);
      setDonationDescription(settingsRes.description ?? DEFAULT_DONATION_SETTINGS.description);
      setTimezone(timezoneRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const filteredDonations = useMemo(() => {
    return donations.filter(d => {
      const matchesSearch = 
        d.donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.donorEmail.toLowerCase().includes(searchQuery.toLowerCase());
      
      const date = new Date(d.created);
      const matchesStart = !startDate || date >= new Date(startDate);
      const matchesEnd = !endDate || date <= new Date(endDate + 'T23:59:59');

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [donations, searchQuery, startDate, endDate]);

  const sortedDonations = useMemo(() => {
    const sorted = [...filteredDonations];
    sorted.sort((a, b) => {
      if (sortBy === 'amount') {
        const diff = b.amountPaidCents - a.amountPaidCents;
        if (diff !== 0) return diff;
        const lastA = getLastName(a.donorName).toLowerCase();
        const lastB = getLastName(b.donorName).toLowerCase();
        if (lastA !== lastB) return lastA.localeCompare(lastB);
        return getFirstName(a.donorName).toLowerCase().localeCompare(getFirstName(b.donorName).toLowerCase());
      }
      if (sortBy === 'name') {
        const lastA = getLastName(a.donorName).toLowerCase();
        const lastB = getLastName(b.donorName).toLowerCase();
        if (lastA !== lastB) return lastA.localeCompare(lastB);
        return getFirstName(a.donorName).toLowerCase().localeCompare(getFirstName(b.donorName).toLowerCase());
      }
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
    return sorted;
  }, [filteredDonations, sortBy]);

  const filteredStats = useMemo(() => {
    const paidDonations = filteredDonations.filter(d => d.status === 'paid');
    const count = paidDonations.length;
    const total = paidDonations.reduce((acc, d) => acc + d.amountPaidCents, 0);
    const avg = count > 0 ? total / count : 0;
    return { count, total, avg };
  }, [filteredDonations]);

  const handleRefund = async (donationId: string) => {
    const confirmed = await dialog.confirm({
      title: 'Refund Donation',
      message: 'Are you sure you want to refund this donation? This will issue a refund on Stripe.',
      confirmLabel: 'Refund',
      variant: 'danger',
    });
    
    if (!confirmed) return;

    try {
      dialog.showToast('Processing refund...');
      await donationService.adminRefundDonation(donationId);
      dialog.showToast('Refund processed successfully.');
      reloadData();
    } catch {
      await dialog.showMessage({
        title: 'Refund Failed',
        message: 'Could not process the refund. Please verify the Stripe Dashboard.',
        variant: 'danger'
      });
    }
  };

  const handleExportCSV = () => {
    if (sortedDonations.length === 0) {
      dialog.showToast('No donations to export.');
      return;
    }
    const headers = ["ID", "Donor Name", "Donor Email", "Amount", "Tribute", "Tribute Name", "Anonymous", "Status", "Date"];

    const mapRow = (d: DonationRecord) => [
      d.id,
      d.donorName,
      d.donorEmail,
      (d.amountPaidCents / 100).toFixed(2),
      d.tributeType,
      d.tributeName || '',
      d.isAnonymous ? 'Yes' : 'No',
      d.status,
      d.created
    ];

    const nonAnonymous = sortedDonations.filter(d => !d.isAnonymous);
    const anonymous = sortedDonations.filter(d => d.isAnonymous);

    const dataRows = [...nonAnonymous.map(mapRow)];
    if (anonymous.length > 0) {
      dataRows.push(["", "ANONYMOUS DONORS", "", "", "", "", "", "", ""]);
      dataRows.push(...anonymous.map(mapRow));
    }

    const csvContent = [headers, ...dataRows].map(e => e.map(String).map(s => `"${s.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `donations_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openLevelModal = (level?: DonationLevel) => {
    if (level) {
      setEditingLevel(level);
      setLevelLabel(level.label);
      setLevelAmount(level.amount);
      setLevelBenefit(level.benefit || '');
    } else {
      setEditingLevel(null);
      setLevelLabel('');
      setLevelAmount(0);
      setLevelBenefit('');
    }
    setIsModalOpen(true);
  };

  const handleSavePublicSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await donationService.saveDonationSettings({
        ...settings,
        buttonText: donationButtonText,
        description: donationDescription,
      });
      dialog.showToast('Public donation settings saved.');
      reloadData();
    } catch (err) {
      console.error(err);
      dialog.showMessage({ title: 'Error', message: 'Failed to save public donation settings.', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLevel = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      let newLevels = [...settings.levels];
      if (editingLevel) {
        newLevels = newLevels.map(l => l.id === editingLevel.id ? { ...l, label: levelLabel, amount: levelAmount, benefit: levelBenefit } : l);
      } else {
        newLevels.push({
          id: `level-${Date.now()}`,
          label: levelLabel,
          amount: levelAmount,
          benefit: levelBenefit
        });
      }

      await donationService.saveDonationSettings({
        ...settings,
        levels: newLevels,
        buttonText: donationButtonText,
        description: donationDescription,
      });
      dialog.showToast('Donation levels saved.');
      setIsModalOpen(false);
      reloadData();
    } catch (err) {
      console.error(err);
      dialog.showMessage({ title: 'Error', message: 'Failed to save donation levels.', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLevel = async (levelId: string) => {
    if (!settings) return;
    const confirmed = await dialog.confirm({
      title: 'Delete Level',
      message: 'Are you sure you want to delete this donation level?',
      confirmLabel: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      const newLevels = settings.levels.filter(l => l.id !== levelId);
      await donationService.saveDonationSettings({ ...settings, levels: newLevels });
      dialog.showToast('Level deleted.');
      reloadData();
    } catch (err) {
      console.error(err);
      dialog.showMessage({ title: 'Error', message: 'Failed to delete level.', variant: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-8 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display m-0">Donations</h1>
          <p className="text-sm text-gray-500">Manage donations and donor levels</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {activeTab === 'history' && (
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              Export CSV
            </button>
          )}
          {activeTab === 'levels' && (
            <button className="btn btn-primary" onClick={() => openLevelModal()}>
              Add Level
            </button>
          )}
        </div>
      </div>

      <div className="mb-1 flex flex-row gap-2 border-b border-gray-200 pb-1">
        <button 
          className={`btn px-4 py-2 font-semibold ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button 
          className={`btn px-4 py-2 font-semibold ${activeTab === 'levels' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('levels')}
        >
          Donor Settings
        </button>
      </div>

      {activeTab === 'history' && (
        <>
          <div className="card bg-neutral-100 p-4">
            <div className="flex h-full items-center justify-around">
              <div className="flex flex-col gap-1 text-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Donations</span>
                <span className="text-headline font-bold">{filteredStats.count}</span>
              </div>
              <div className="flex flex-col gap-1 text-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Total Raised</span>
                <span className="text-headline font-bold text-pink-600">
                  ${(filteredStats.total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Average</span>
                <span className="text-headline font-bold">
                  ${(filteredStats.avg / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <AppCard title="Donations History">
            <div className="flex flex-col gap-4">
              <div className="flex w-full flex-row flex-wrap items-center gap-4">
                <div className="w-full min-w-[200px] flex-1">
                  <input 
                    type="text" 
                    placeholder="Search donor name or email..." 
                    className="card h-10 w-full border border-gray-200 px-3"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="min-w-[150px] flex-1">
                  <input 
                    type="date" 
                    className="card h-10 w-full cursor-pointer border border-gray-200 px-3"
                    value={startDate}
                    onChange={e => handleSetStartDate(e.target.value)}
                    placeholder="View From"
                  />
                </div>
                <div className="min-w-[150px] flex-1">
                  <input 
                    type="date" 
                    className="card h-10 w-full cursor-pointer border border-gray-200 px-3"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    placeholder="To"
                  />
                </div>
                <div className="min-w-[200px]">
                  <select
                    className="card h-10 w-full cursor-pointer border border-gray-200 px-3"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as 'amount' | 'name' | 'date')}
                  >
                    <option value="date">Sort by Date</option>
                    <option value="amount">Sort by Amount</option>
                    <option value="name">Sort by Name</option>
                  </select>
                </div>
                <button className="btn btn-ghost" onClick={handleClearFilters}>
                  Reset
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-sm text-gray-500">
                    <th className="p-3 px-4 text-left">Date</th>
                    <th className="p-3 px-4 text-left">Donor</th>
                    <th className="p-3 px-4 text-left">Email</th>
                    <th className="p-3 px-4 text-right">Amount</th>
                    <th className="p-3 px-4 text-left">Tribute</th>
                    <th className="p-3 px-4 text-left">Status</th>
                    <th className="p-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="p-3 px-4 text-center">Loading...</td></tr>
                  ) : sortedDonations.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">No donations found.</td></tr>
                  ) : sortedDonations.map(d => (
                    <tr key={d.id} className="border-b border-gray-200 text-sm">
                      <td className="p-3 px-4">{formatInTimezone(d.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                      <td className="p-3 px-4 font-semibold">
                        {d.donorName}
                        {d.isAnonymous && <span className="ml-2 inline-flex items-center rounded bg-transparent px-2 py-0.5 text-xs font-semibold tracking-wider text-text-muted uppercase">Anonymous</span>}
                      </td>
                      <td className="p-3 px-4">{d.donorEmail}</td>
                      <td className="p-3 px-4 text-right font-semibold">${(d.amountPaidCents / 100).toFixed(2)}</td>
                      <td className="p-3 px-4">
                        {d.tributeType !== 'none' && (
                          <span className="text-gray-500">
                            In {d.tributeType === 'memory' ? 'Memory' : 'Honor'} of <strong>{d.tributeName}</strong>
                          </span>
                        )}
                      </td>
                      <td className="p-3 px-4">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase ${d.status === 'paid' ? 'bg-success-bg text-success-text' : d.status === 'refunded' ? 'bg-danger-bg text-danger-text' : 'bg-amber-100 text-amber-800'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3 px-2 text-right">
                        {d.status === 'paid' && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleRefund(d.id)}>
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          </AppCard>
        </>
      )}

      {activeTab === 'levels' && (
        <>
          <AppCard className="m-0 rounded-lg border-l-4 border-pink-600 bg-[rgba(219,39,119,0.05)] p-4">
            <h3 className="mb-2 text-pink-600">Donor Levels</h3>
            <p className="m-0">These levels are displayed to donors on the public donation page.</p>
          </AppCard>

          <AppCard title="Public Page Settings">
            <div className="flex flex-col gap-4">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Call-to-Action Heading</label>
                <input
                  type="text"
                  className="h-10 w-full border border-gray-200 px-3"
                  value={donationButtonText}
                  onChange={e => setDonationButtonText(e.target.value)}
                  placeholder="e.g. Support our Music"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                <textarea
                  className="min-h-[80px] resize-y border border-gray-200 p-2"
                  value={donationDescription}
                  onChange={e => setDonationDescription(e.target.value)}
                  placeholder="e.g. Your contribution helps us keep the music playing..."
                />
              </div>
              <div className="flex gap-4">
                <button
                  className="btn btn-primary"
                  onClick={handleSavePublicSettings}
                  disabled={saving || !donationButtonText}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </AppCard>

          <AppCard title="Donor Levels Configuration" noPadding>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-sm text-gray-500">
                    <th className="p-3 px-4 text-left">Label</th>
                    <th className="p-3 px-4 text-right">Amount</th>
                    <th className="p-3 px-4 text-left">Benefit</th>
                    <th className="p-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!settings || settings.levels.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">No donor levels defined.</td></tr>
                  ) : settings.levels.map(l => (
                    <tr key={l.id} className="border-b border-gray-200 text-sm">
                      <td className="p-3 px-4 font-semibold">{l.label}</td>
                      <td className="p-3 px-4 text-right font-semibold">${l.amount}</td>
                      <td className="p-3 px-4">{l.benefit}</td>
                      <td className="p-3 px-4 text-right">
                        <button className="btn btn-sm btn-ghost" onClick={() => openLevelModal(l)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-ghost btn-danger" onClick={() => handleDeleteLevel(l.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AppCard>
        </>
      )}

      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLevel ? 'Edit Donor Level' : 'Add Donor Level'}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Level Label</label>
            <input 
              type="text" 
              className="h-10 w-full border border-gray-200 px-3"
              value={levelLabel} 
              onChange={e => setLevelLabel(e.target.value)}
              placeholder="e.g. Supporter"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Amount ($)</label>
            <input 
              type="number" 
              className="h-10 w-full border border-gray-200 px-3"
              value={levelAmount} 
              onChange={e => setLevelAmount(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Benefit (Optional)</label>
            <textarea 
              className="min-h-[80px] resize-y border border-gray-200 p-2"
              value={levelBenefit} 
              onChange={e => setLevelBenefit(e.target.value)}
              placeholder="e.g. Mention in program"
            />
          </div>
          <div className="mt-4 flex gap-4">
            <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveLevel} disabled={saving || !levelLabel || levelAmount <= 0}>
              {saving ? 'Saving...' : 'Save Level'}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}
