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
import './Donations.css';

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
    <div className="admin-view-container">
      <div className="admin-view-header flex-responsive">
        <div>
          <h1 className="text-display donation-title">Donations</h1>
          <p className="text-muted text-sm">Manage donations and donor levels</p>
        </div>
        <div className="admin-view-actions">
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

      <div className="donation-tabs">
        <button 
          className={`donation-tab-button btn ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button 
          className={`donation-tab-button btn ${activeTab === 'levels' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('levels')}
        >
          Donor Settings
        </button>
      </div>

      {activeTab === 'history' && (
        <>
          <div className="card donation-stats-card">
            <div className="donation-stats-inline">
              <div className="donation-stat-item">
                <span className="donation-stat-label">Donations</span>
                <span className="donation-stat-value">{filteredStats.count}</span>
              </div>
              <div className="donation-stat-item">
                <span className="donation-stat-label">Total Raised</span>
                <span className="donation-stat-value donation-stat-value-primary">
                  ${(filteredStats.total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="donation-stat-item">
                <span className="donation-stat-label">Average</span>
                <span className="donation-stat-value">
                  ${(filteredStats.avg / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <AppCard noPadding>
            <div className="donation-checklist-container">
              <div className="donation-search-row flex-responsive">
                <div className="donation-search-input-wrapper">
                  <input 
                    type="text" 
                    placeholder="Search donor name or email..." 
                    className="card donation-input"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="donation-date-input-wrapper">
                  <input 
                    type="date" 
                    className="card donation-input"
                    value={startDate}
                    onChange={e => handleSetStartDate(e.target.value)}
                    placeholder="View From"
                  />
                </div>
                <div className="donation-date-input-wrapper">
                  <input 
                    type="date" 
                    className="card donation-input"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    placeholder="To"
                  />
                </div>
                <button className="btn btn-ghost" onClick={handleClearFilters}>
                  Reset
                </button>
                <div className="donation-sort-wrapper">
                  <select
                    className="card donation-sort-select"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as 'amount' | 'name' | 'date')}
                  >
                    <option value="date">Sort by Date</option>
                    <option value="amount">Sort by Amount</option>
                    <option value="name">Sort by Name</option>
                  </select>
                </div>
              </div>
              <div className="donation-table-container">
                <table className="donation-table w-full text-left">
                <thead>
                  <tr className="donation-table-header-row">
                    <th className="donation-table-th">Date</th>
                    <th className="donation-table-th">Donor</th>
                    <th className="donation-table-th">Email</th>
                    <th className="donation-table-th-right">Amount</th>
                    <th className="donation-table-th">Tribute</th>
                    <th className="donation-table-th">Status</th>
                    <th className="donation-table-th-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="donation-table-td donation-text-center">Loading...</td></tr>
                  ) : sortedDonations.length === 0 ? (
                    <tr><td colSpan={7} className="donation-table-td donation-text-center admin-empty-state">No donations found.</td></tr>
                  ) : sortedDonations.map(d => (
                    <tr key={d.id} className="donation-table-row">
                      <td className="donation-table-td">{formatInTimezone(d.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                      <td className="donation-table-td-bold">
                        {d.donorName}
                        {d.isAnonymous && <span className="badge badge-ghost donation-ml-sm">Anonymous</span>}
                      </td>
                      <td className="donation-table-td">{d.donorEmail}</td>
                      <td className="donation-table-td-right-bold">${(d.amountPaidCents / 100).toFixed(2)}</td>
                      <td className="donation-table-td">
                        {d.tributeType !== 'none' && (
                          <span className="text-muted">
                            In {d.tributeType === 'memory' ? 'Memory' : 'Honor'} of <strong>{d.tributeName}</strong>
                          </span>
                        )}
                      </td>
                      <td className="donation-table-td">
                        <span className={`badge ${d.status === 'paid' ? 'badge-success' : d.status === 'refunded' ? 'badge-danger' : 'badge-warning'} donation-status-badge`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="donation-table-td-right">
                        {d.status === 'paid' && (
                          <button className="btn btn-sm btn-ghost btn-danger" onClick={() => handleRefund(d.id)}>
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
          <AppCard className="donation-info-box">
            <h3 className="donation-mb-sm donation-color-primary">Donor Levels</h3>
            <p className="donation-m-0">These levels are displayed to donors on the public donation page.</p>
          </AppCard>

          <AppCard title="Public Page Settings">
            <div className="donation-form">
              <div className="donation-form-group">
                <label className="small uppercase bold text-muted">Call-to-Action Heading</label>
                <input
                  type="text"
                  className="donation-input"
                  value={donationButtonText}
                  onChange={e => setDonationButtonText(e.target.value)}
                  placeholder="e.g. Support our Music"
                />
              </div>
              <div className="donation-form-group">
                <label className="small uppercase bold text-muted">Description</label>
                <textarea
                  className="donation-textarea"
                  value={donationDescription}
                  onChange={e => setDonationDescription(e.target.value)}
                  placeholder="e.g. Your contribution helps us keep the music playing..."
                />
              </div>
              <div className="donation-form-row">
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
            <div className="donation-table-container">
              <table className="donation-table w-full text-left">
                <thead>
                  <tr className="donation-table-header-row">
                    <th className="donation-table-th">Label</th>
                    <th className="donation-table-th-right">Amount</th>
                    <th className="donation-table-th">Benefit</th>
                    <th className="donation-table-th-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!settings || settings.levels.length === 0 ? (
                    <tr><td colSpan={4} className="donation-table-td donation-text-center admin-empty-state">No donor levels defined.</td></tr>
                  ) : settings.levels.map(l => (
                    <tr key={l.id} className="donation-table-row">
                      <td className="donation-table-td-bold">{l.label}</td>
                      <td className="donation-table-td-right-bold">${l.amount}</td>
                      <td className="donation-table-td">{l.benefit}</td>
                      <td className="donation-table-td-right">
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
        <div className="donation-form">
          <div className="donation-form-group">
            <label className="small uppercase bold text-muted">Level Label</label>
            <input 
              type="text" 
              className="donation-input" 
              value={levelLabel} 
              onChange={e => setLevelLabel(e.target.value)}
              placeholder="e.g. Supporter"
            />
          </div>
          <div className="donation-form-group">
            <label className="small uppercase bold text-muted">Amount ($)</label>
            <input 
              type="number" 
              className="donation-input" 
              value={levelAmount} 
              onChange={e => setLevelAmount(Number(e.target.value))}
            />
          </div>
          <div className="donation-form-group">
            <label className="small uppercase bold text-muted">Benefit (Optional)</label>
            <textarea 
              className="donation-textarea" 
              value={levelBenefit} 
              onChange={e => setLevelBenefit(e.target.value)}
              placeholder="e.g. Mention in program"
            />
          </div>
          <div className="donation-form-row donation-mt-md">
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
