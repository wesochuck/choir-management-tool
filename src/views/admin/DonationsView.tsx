import { useCallback, useEffect, useMemo, useState } from 'react';
import { donationService, type DonationRecord, type DonationLevel, type DonationSettings, DEFAULT_DONATION_SETTINGS } from '../../services/donationService';
import { settingsService } from '../../services/settingsService';
import { AppCard } from '../../components/common/AppCard';
import { Button, FormField, Badge, Modal, EmptyState, Select, Input, Textarea } from '../../components/ui';
import { useDialog } from '../../contexts/DialogContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';
import { safeLocalStorage } from '../../lib/storage';
import { getFirstName, getLastName } from '../../lib/stringUtils';
import SlTabGroup from '@shoelace-style/shoelace/dist/react/tab-group/index.js';
import SlTab from '@shoelace-style/shoelace/dist/react/tab/index.js';
import SlTabPanel from '@shoelace-style/shoelace/dist/react/tab-panel/index.js';

const TabGroup = SlTabGroup as unknown as React.ComponentType<
  React.ComponentProps<typeof SlTabGroup> & {
    value?: string;
  }
>;

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
    <div className="flex w-full flex-col gap-6">
      {/* Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Donations & Giving
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
            Monitor your choir's incoming donations, analyze giving statistics, and manage public donation portal settings and recognition tiers.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'history' && (
            <Button
              variant="secondary"
              className="px-3 font-semibold md:px-6"
              onClick={handleExportCSV}
              disabled={sortedDonations.length === 0}
              title="Export CSV"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
            >
              <span className="hidden md:inline">Export CSV</span>
            </Button>
          )}
          {activeTab === 'levels' && (
            <Button
              variant="primary"
              className="animate-pulse-once px-3 font-semibold md:px-6"
              onClick={() => openLevelModal()}
              title="Add Level"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              <span className="hidden md:inline">Add Level</span>
            </Button>
          )}
        </div>
      </div>

      <TabGroup
        value={activeTab}
        onSlTabShow={(e: unknown) => {
          const customEvent = e as CustomEvent;
          setActiveTab(customEvent.detail.name as 'history' | 'levels');
        }}
      >
        <SlTab slot="nav" panel="history">
          Donation History
        </SlTab>
        <SlTab slot="nav" panel="levels">
          Tiers & Page Settings
        </SlTab>

        {/* History Tab Content */}
        <SlTabPanel name="history">
        <div className="flex flex-col gap-6">
          {/* Stats Analytics Dashboard */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Donations Count Card */}
            <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="absolute top-0 left-0 h-1.5 w-full bg-slate-400 transition-colors group-hover:bg-slate-500" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Donations Count
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                    {filteredStats.count}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-slate-500 transition-colors group-hover:bg-slate-100">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Raised Card */}
            <div className="group relative overflow-hidden rounded-2xl border border-pink-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="absolute top-0 left-0 h-1.5 w-full bg-pink-500 transition-colors group-hover:bg-pink-600" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold tracking-wider text-pink-500 uppercase">
                    Total Raised
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-pink-600">
                    ${(filteredStats.total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl bg-pink-50 p-3 text-pink-500 transition-colors group-hover:bg-pink-100/80">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Average Donation Card */}
            <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="absolute top-0 left-0 h-1.5 w-full bg-emerald-500 transition-colors group-hover:bg-emerald-600" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold tracking-wider text-emerald-600 uppercase">
                    Average Gift
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-emerald-800">
                    ${(filteredStats.avg / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 transition-colors group-hover:bg-emerald-100/80">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <AppCard noPadding>
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-800">Donations Register</h3>
            </div>
            <div className="flex flex-col gap-4 p-6">
              {/* Filter deck */}
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 md:grid-cols-4">
                <div className="md:col-span-1">
                  <FormField label="Search">
                    <Input 
                      placeholder="Donor name or email..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    >
                      <svg slot="prefix" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
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
                        onChange={e => handleSetStartDate(e.target.value)}
                      />
                    </FormField>
                  </div>
                  <div className="min-w-0 flex-1">
                    <FormField label="To Date">
                      <Input 
                        type="date" 
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                      />
                    </FormField>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <FormField label="Sort By">
                      <Select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as 'amount' | 'name' | 'date')}

                      >
                        <option value="date">Date (Newest First)</option>
                        <option value="amount">Amount (Highest First)</option>
                        <option value="name">Donor Name</option>
                      </Select>
                    </FormField>
                  </div>
                  {(searchQuery || startDate || endDate) && (
                    <Button 
                      variant="outline" 
                      onClick={handleClearFilters}
                      className="flex h-10 items-center justify-center px-3 font-semibold"
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

              {/* Responsive Register View - Desktop Table */}
              <div className="hidden overflow-x-auto rounded-xl border border-slate-100 shadow-sm md:block">
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50/75">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Date</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Donor</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Email</th>
                      <th className="px-6 py-3.5 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">Amount</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Tribute</th>
                      <th className="px-6 py-3.5 text-center text-xs font-bold tracking-wider text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-3.5 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm font-medium text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                            Loading donations history...
                          </div>
                        </td>
                      </tr>
                    ) : sortedDonations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <EmptyState
                            title="No Donations Found"
                            description={
                              searchQuery || startDate || endDate
                                ? "No gifts match your search/filter criteria."
                                : "No donation records are available yet."
                            }
                            icon="💝"
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
                      sortedDonations.map(d => (
                        <tr key={d.id} className="transition-colors hover:bg-slate-50/40">
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-slate-500">
                            {formatInTimezone(d.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                            <div className="flex flex-col gap-0.5">
                              <span>{d.donorName}</span>
                              {d.isAnonymous && (
                                <span className="inline-flex w-fit items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-600 uppercase">
                                  Anonymous
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">
                            {d.donorEmail}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-extrabold whitespace-nowrap text-slate-900">
                            ${(d.amountPaidCents / 100).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm leading-relaxed text-slate-500">
                            {d.tributeType !== 'none' ? (
                              <span className="inline-flex flex-wrap items-center gap-1">
                                <span className="text-slate-400">In {d.tributeType === 'memory' ? 'Memory' : 'Honor'} of</span>
                                <strong className="font-semibold text-slate-700">{d.tributeName}</strong>
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center text-sm">
                            <Badge tone={d.status === 'paid' ? 'success' : d.status === 'refunded' ? 'danger' : 'neutral'}>
                              {d.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                            {d.status === 'paid' && (
                              <Button 
                                variant="danger" 
                                size="small" 
                                className="font-semibold"
                                onClick={() => handleRefund(d.id)}
                              >
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

              {/* Responsive Register View - Mobile Card List */}
              <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm md:hidden">
                <div className="divide-y divide-slate-100">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center text-sm font-medium text-slate-400">
                      <span className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                      Loading donations history...
                    </div>
                  ) : sortedDonations.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <EmptyState
                        title="No Donations Found"
                        description={
                          searchQuery || startDate || endDate
                            ? "No gifts match your search/filter criteria."
                            : "No donation records are available yet."
                        }
                        icon="💝"
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
                    sortedDonations.map(d => (
                      <div key={d.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50/40">
                        {/* Row 1: Date and Status badge */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-400">
                            {formatInTimezone(d.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <Badge tone={d.status === 'paid' ? 'success' : d.status === 'refunded' ? 'danger' : 'neutral'}>
                            {d.status}
                          </Badge>
                        </div>

                        {/* Row 2: Donor info & Amount */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-bold text-slate-800">{d.donorName}</span>
                            {d.isAnonymous && (
                              <span className="inline-flex w-fit items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-slate-600 uppercase">
                                Anonymous
                              </span>
                            )}
                            <span className="text-xs font-medium break-all text-slate-500">{d.donorEmail}</span>
                          </div>
                          <span className="shrink-0 text-base font-extrabold text-slate-900">
                            ${(d.amountPaidCents / 100).toFixed(2)}
                          </span>
                        </div>

                        {/* Row 3: Tribute type and info */}
                        {d.tributeType !== 'none' && (
                          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-xs leading-relaxed text-slate-500">
                            <span className="text-slate-400">In {d.tributeType === 'memory' ? 'Memory' : 'Honor'} of</span>{' '}
                            <strong className="font-semibold text-slate-700">{d.tributeName}</strong>
                          </div>
                        )}

                        {/* Row 4: Actions (if status is 'paid') */}
                        {d.status === 'paid' && (
                          <div className="mt-1 flex justify-end border-t border-slate-50 pt-1.5">
                            <Button 
                              variant="danger" 
                              size="small" 
                              className="w-full py-1.5 text-xs font-semibold"
                              onClick={() => handleRefund(d.id)}
                            >
                              Refund
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </AppCard>
        </div>
        </SlTabPanel>

        {/* Levels & Portal Settings Tab Content */}
        <SlTabPanel name="levels">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          {/* Public Portal Configuration Card */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            <AppCard>
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-800">Portal Configuration</h3>
              </div>
              <div className="mt-2 flex flex-col gap-5">
                <p className="text-xs leading-relaxed text-slate-500">
                  Customize the heading text and detailed descriptive message shown to users on your public-facing checkout/donation webpage.
                </p>
                <FormField label="Call-to-Action Heading" required>
                  <Input
                    type="text"
                    value={donationButtonText}
                    onChange={e => setDonationButtonText(e.target.value)}
                    placeholder="e.g. Support our Music"
                    required
                  />
                </FormField>
                <FormField label="Portal Description">
                  <Textarea
                    rows={5}
                    value={donationDescription}
                    onChange={e => setDonationDescription(e.target.value)}
                    placeholder="e.g. Your contribution helps us keep the music playing..."
                  />
                </FormField>
                <Button
                  variant="primary"
                  className="mt-2 w-full font-semibold"
                  onClick={handleSavePublicSettings}
                  disabled={saving || !donationButtonText.trim()}
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Saving Settings...
                    </span>
                  ) : 'Save Settings'}
                </Button>
              </div>
            </AppCard>
          </div>

          {/* Donor Tiers / Levels Cards Configuration */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="flex flex-col gap-4">
              {/* Alert Info Notice Panel */}
              <div className="flex items-start gap-3 rounded-2xl border border-pink-100 bg-pink-50/30 p-5 shadow-sm">
                <div className="shrink-0 rounded-xl bg-pink-100 p-2.5 text-pink-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-extrabold text-pink-800">Donor Levels</h3>
                  <p className="mt-1 text-sm leading-relaxed font-medium text-slate-600">
                    These levels are displayed to donors on the public donation checkout page to encourage higher donation amounts by highlighting tier benefits.
                  </p>
                </div>
              </div>

              {/* Levels Grid */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {!settings || settings.levels.length === 0 ? (
                  <div className="col-span-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <EmptyState
                      title="No Donor Levels Configured"
                      description="Create recognition tiers to prompt donors with suggesting amounts."
                      icon="🌟"
                      action={
                        <Button
                          variant="primary"
                          size="small"
                          className="font-semibold"
                          onClick={() => openLevelModal()}
                        >
                          + Create First Level
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <>
                    {settings.levels.map(l => (
                      <div key={l.id} className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div>
                          <div className="flex items-start justify-between gap-4">
                            <h4 className="truncate text-base font-extrabold text-slate-900">
                              {l.label}
                            </h4>
                            <span className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700 ring-1 ring-emerald-600/10">
                              ${l.amount.toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="mt-3 min-h-[48px] border-t border-slate-100 pt-3">
                            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Benefit & Perks</span>
                            <p className="mt-1 text-sm leading-relaxed font-medium text-slate-600">
                              {l.benefit ? l.benefit : <span className="text-slate-300 italic">No benefit specified</span>}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-50 pt-3 opacity-100 transition-opacity duration-150 group-hover:opacity-100 sm:opacity-0">
                          <Button 
                            variant="outline" 
                            size="small" 
                            className="h-8 border-none font-bold"
                            onClick={() => openLevelModal(l)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="danger" 
                            size="small" 
                            className="h-8 border-none font-bold"
                            onClick={() => handleDeleteLevel(l.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* interactive "+ Add Level" trigger card */}
                    <Button
                      variant="outline"
                      onClick={() => openLevelModal()}
                      className="group flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/20 p-5 text-center transition-all hover:border-primary hover:bg-slate-50"
                    >
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-2.5 text-slate-400 shadow-sm transition-colors group-hover:border-primary/40 group-hover:text-primary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </div>
                      <span className="mt-3 text-sm font-bold text-slate-500 transition-colors group-hover:text-primary">
                        + Add Donor Level
                      </span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        </SlTabPanel>
      </TabGroup>

      {/* Levels CRUD Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLevel ? 'Edit Donor Level' : 'Create Donor Level'}
        maxWidth="500px"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" className="font-semibold" onClick={() => setIsModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              className="font-semibold"
              onClick={handleSaveLevel} 
              disabled={saving || !levelLabel.trim() || levelAmount <= 0}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </span>
              ) : 'Save Level'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label="Level Label" required>
            <Input 
              type="text" 
              value={levelLabel} 
              onChange={e => setLevelLabel(e.target.value)}
              placeholder="e.g. Bronze, Gold, Supporter..."
              required
            />
          </FormField>
          <FormField label="Minimum Amount ($)" required>
            <Input 
              type="number" 
              min={1}
              value={levelAmount || ''} 
              onChange={e => setLevelAmount(Math.max(0, Number(e.target.value)))}
              placeholder="e.g. 50"
              required
            />
          </FormField>
          <FormField label="Benefit / Perks (Optional)">
            <Textarea 
              rows={3}
              value={levelBenefit} 
              onChange={e => setLevelBenefit(e.target.value)}
              placeholder="e.g. Mention in concert program, early access..."
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
