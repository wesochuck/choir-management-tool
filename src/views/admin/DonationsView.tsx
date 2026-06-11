import { useCallback, useEffect, useMemo, useState } from 'react';
import { donationService, type DonationRecord, type DonationLevel, type DonationSettings, DEFAULT_DONATION_SETTINGS } from '../../services/donationService';
import { settingsService } from '../../services/settingsService';
import { AppCard } from '../../components/common/AppCard';
import { Button, Input, Select, TabPanel, FormField, Badge, Modal } from '../../components/ui';
import { useDialog } from '../../contexts/DialogContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Donations
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage donations and donor levels
        </p>
      </div>

      <div className="border-b border-border">
        <div className="-mb-px flex items-center justify-between">
          <nav className="flex gap-2">
            <button
              className={`cursor-pointer rounded-t-lg px-5 py-2.5 text-sm font-medium ${
                activeTab === 'history'
                  ? 'bg-primary text-surface'
                  : 'border border-border bg-surface text-text-muted hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
            <button
              className={`cursor-pointer rounded-t-lg px-5 py-2.5 text-sm font-medium ${
                activeTab === 'levels'
                  ? 'bg-primary text-surface'
                  : 'border border-border bg-surface text-text-muted hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('levels')}
            >
              Donor Settings
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {activeTab === 'history' && (
              <Button variant="secondary" onClick={handleExportCSV}>
                Export CSV
              </Button>
            )}
            {activeTab === 'levels' && (
              <Button variant="primary" onClick={() => openLevelModal()}>
                Add Level
              </Button>
            )}
          </div>
        </div>
      </div>

      <TabPanel tabId="history" activeTab={activeTab}>
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface px-6 py-5 shadow-sm">
              <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                Donations
              </p>
              <p className="mt-2 text-3xl font-bold text-text">
                {filteredStats.count}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface px-6 py-5 shadow-sm">
              <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                Total Raised
              </p>
              <p className="mt-2 text-3xl font-bold text-pink-600">
                ${(filteredStats.total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface px-6 py-5 shadow-sm">
              <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                Average
              </p>
              <p className="mt-2 text-3xl font-bold text-text">
                ${(filteredStats.avg / 100).toFixed(2)}
              </p>
            </div>
          </div>

          <AppCard title="Donations History">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-slate-50/50 p-4">
                <div className="min-w-[200px] flex-1">
                  <FormField label="Search">
                    <Input 
                      type="text" 
                      placeholder="Search donor name or email..." 
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
                      onChange={e => setSortBy(e.target.value as 'amount' | 'name' | 'date')}
                    >
                      <option value="date">Sort by Date</option>
                      <option value="amount">Sort by Amount</option>
                      <option value="name">Sort by Name</option>
                    </Select>
                  </FormField>
                </div>
                {(searchQuery || startDate || endDate) && (
                  <Button variant="ghost" onClick={handleClearFilters} className="h-[44px]">
                    Reset
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">Donor</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">Email</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold tracking-wide text-text-muted uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">Tribute</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold tracking-wide text-text-muted uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-sm text-text-muted">
                          Loading...
                        </td>
                      </tr>
                    ) : sortedDonations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-sm text-text-muted">
                          No donations found.
                        </td>
                      </tr>
                    ) : (
                      sortedDonations.map(d => (
                        <tr key={d.id} className="transition-colors hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-sm text-text">
                            {formatInTimezone(d.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-text">
                            {d.donorName}
                            {d.isAnonymous && (
                              <span className="ml-2 inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold tracking-wider text-text-muted uppercase">
                                Anonymous
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-text-muted">
                            {d.donorEmail}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-semibold text-text">
                            ${(d.amountPaidCents / 100).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-text-muted">
                            {d.tributeType !== 'none' && (
                              <span>
                                In {d.tributeType === 'memory' ? 'Memory' : 'Honor'} of <strong>{d.tributeName}</strong>
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <Badge tone={d.status === 'paid' ? 'success' : d.status === 'refunded' ? 'danger' : 'neutral'}>
                              {d.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right text-sm">
                            {d.status === 'paid' && (
                              <Button variant="danger" size="small" onClick={() => handleRefund(d.id)}>
                                Refund
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </AppCard>
        </div>
      </TabPanel>

      <TabPanel tabId="levels" activeTab={activeTab}>
        <div className="flex flex-col gap-6">
          <AppCard className="m-0 rounded-lg border-l-4 border-pink-600 bg-pink-500/5 p-4">
            <h3 className="mb-2 text-base font-bold text-pink-600">Donor Levels</h3>
            <p className="m-0 text-sm text-text">These levels are displayed to donors on the public donation page.</p>
          </AppCard>

          <AppCard title="Public Page Settings">
            <div className="flex flex-col gap-4">
              <FormField label="Call-to-Action Heading" required>
                <Input
                  type="text"
                  value={donationButtonText}
                  onChange={e => setDonationButtonText(e.target.value)}
                  placeholder="e.g. Support our Music"
                  required
                />
              </FormField>
              <FormField label="Description">
                <textarea
                  className="min-h-[80px] w-full resize-y rounded-md border border-border bg-surface p-3 text-sm text-text outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(74,124,89,0.25)]"
                  value={donationDescription}
                  onChange={e => setDonationDescription(e.target.value)}
                  placeholder="e.g. Your contribution helps us keep the music playing..."
                />
              </FormField>
              <div className="flex gap-4">
                <Button
                  variant="primary"
                  onClick={handleSavePublicSettings}
                  disabled={saving || !donationButtonText}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </AppCard>

          <AppCard title="Donor Levels Configuration" noPadding>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">Label</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold tracking-wide text-text-muted uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">Benefit</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold tracking-wide text-text-muted uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {!settings || settings.levels.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-text-muted">
                        No donor levels defined.
                      </td>
                    </tr>
                  ) : (
                    settings.levels.map(l => (
                      <tr key={l.id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-sm font-semibold text-text">{l.label}</td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-text">${l.amount}</td>
                        <td className="px-6 py-4 text-sm text-text-muted">{l.benefit}</td>
                        <td className="px-6 py-4 text-right text-sm">
                          <div className="flex flex-row justify-end gap-2">
                            <Button variant="ghost" size="small" onClick={() => openLevelModal(l)}>
                              Edit
                            </Button>
                            <Button variant="danger" size="small" onClick={() => handleDeleteLevel(l.id)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </AppCard>
        </div>
      </TabPanel>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLevel ? 'Edit Donor Level' : 'Add Donor Level'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveLevel} disabled={saving || !levelLabel || levelAmount <= 0}>
              {saving ? 'Saving...' : 'Save Level'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label="Level Label" required>
            <Input 
              type="text" 
              value={levelLabel} 
              onChange={e => setLevelLabel(e.target.value)}
              placeholder="e.g. Supporter"
              required
            />
          </FormField>
          <FormField label="Amount ($)" required>
            <Input 
              type="number" 
              value={levelAmount} 
              onChange={e => setLevelAmount(Number(e.target.value))}
              required
            />
          </FormField>
          <FormField label="Benefit (Optional)">
            <textarea 
              className="min-h-[80px] w-full resize-y rounded-md border border-border bg-surface p-3 text-sm text-text outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(74,124,89,0.25)]"
              value={levelBenefit} 
              onChange={e => setLevelBenefit(e.target.value)}
              placeholder="e.g. Mention in program"
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
