import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { donationService, type DonationRecord } from '../../services/donationService';
import { AppCard } from '../../components/common/AppCard';
import { Button, TabGroup, Tab, TabPanel, DataTable } from '../../components/ui';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { useDialog } from '../../contexts/DialogContext';
import { useDocumentTitle, useChoirSettings } from '../../hooks/useDocumentTitle';
import DonationStatsCards from './donations/DonationStatsCards';
import DonationFilters from './donations/DonationFilters';
import DonationMobileCard from './donations/DonationMobileCard';
import { createDonationColumns } from './donations/donationColumns';
import PortalConfigCard from './donations/PortalConfigCard';
import DonorLevelGrid from './donations/DonorLevelGrid';
import DonorLevelModal from './donations/DonorLevelModal';
import { useDonationFilters } from './donations/useDonationFilters';
import { useDonationLevels } from './donations/useDonationLevels';

export default function DonationsView() {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const { timezone } = useChoirSettings();
  useDocumentTitle('Donations');
  const [activeTab, setActiveTab] = useState<'history' | 'levels'>('history');

  const donationsQuery = useQuery({
    queryKey: queryKeys.donations.paid,
    queryFn: () => donationService.getDonations(),
    staleTime: 30_000,
  });
  const donations = useMemo(() => donationsQuery.data ?? [], [donationsQuery.data]);

  const settingsQuery = useQuery({
    queryKey: queryKeys.donations.settings,
    queryFn: () => donationService.getDonationSettings(),
    staleTime: 30_000,
  });
  const settings = settingsQuery.data ?? null;

  const loading = donationsQuery.isLoading || settingsQuery.isLoading;

  const {
    searchQuery,
    setSearchQuery,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    sortBy,
    setSortBy,
    handleClearFilters,
    sortedDonations,
    filteredStats,
    hasActiveFilters,
  } = useDonationFilters(donations);

  const {
    isModalOpen,
    editingLevel,
    levelLabel,
    setLevelLabel,
    levelAmount,
    setLevelAmount,
    levelBenefit,
    setLevelBenefit,
    openLevelModal,
    closeModal,
    handleSaveLevel,
    handleDeleteLevel,
    handleSavePublicSettings,
    saving,
    portalButtonText,
    setPortalButtonText,
    portalDescription,
    setPortalDescription,
  } = useDonationLevels(settings);

  const refundMutation = useMutation({
    mutationFn: (donationId: string) => donationService.adminRefundDonation(donationId),
  });

  const handleRefund = useCallback(
    async (donationId: string) => {
      const confirmed = await dialog.confirm({
        title: 'Refund Donation',
        message:
          'Are you sure you want to refund this donation? This will issue a refund on Stripe.',
        confirmLabel: 'Refund',
        variant: 'danger',
      });
      if (!confirmed) return;
      try {
        dialog.showToast('Processing refund...');
        await refundMutation.mutateAsync(donationId);
        dialog.showToast('Refund processed successfully.');
        queryClient.invalidateQueries({ queryKey: queryKeys.donations.all });
      } catch {
        await dialog.showMessage({
          title: 'Refund Failed',
          message: 'Could not process the refund. Please verify the Stripe Dashboard.',
          variant: 'danger',
        });
      }
    },
    [dialog, queryClient, refundMutation]
  );

  const handleExportCSV = () => {
    if (sortedDonations.length === 0) {
      dialog.showToast('No donations to export.');
      return;
    }
    const headers = [
      'ID',
      'Donor Name',
      'Donor Email',
      'Amount',
      'Tribute',
      'Tribute Name',
      'Anonymous',
      'Status',
      'Date',
    ];
    const mapRow = (d: DonationRecord) => [
      d.id,
      d.donorName,
      d.donorEmail,
      (d.amountPaidCents / 100).toFixed(2),
      d.tributeType,
      d.tributeName || '',
      d.isAnonymous ? 'Yes' : 'No',
      d.status,
      d.created,
    ];
    const nonAnonymous = sortedDonations.filter((d) => !d.isAnonymous);
    const anonymous = sortedDonations.filter((d) => d.isAnonymous);
    const dataRows = [...nonAnonymous.map(mapRow)];
    if (anonymous.length > 0) {
      dataRows.push(['', 'ANONYMOUS DONORS', '', '', '', '', '', '', '']);
      dataRows.push(...anonymous.map(mapRow));
    }
    const csvContent = [headers, ...dataRows]
      .map((e) =>
        e
          .map(String)
          .map((s) => `"${s.replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `donations_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLevelSave = async () => {
    try {
      await handleSaveLevel();
      dialog.showToast('Donation levels saved.');
      closeModal();
      queryClient.invalidateQueries({ queryKey: queryKeys.donations.all });
    } catch (err) {
      console.error(err);
      await dialog.showMessage({
        title: 'Error',
        message: 'Failed to save donation levels.',
        variant: 'danger',
      });
    }
  };

  const handleLevelDelete = async (levelId: string) => {
    const confirmed = await dialog.confirm({
      title: 'Delete Level',
      message: 'Are you sure you want to delete this donation level?',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await handleDeleteLevel(levelId);
      dialog.showToast('Level deleted.');
      queryClient.invalidateQueries({ queryKey: queryKeys.donations.all });
    } catch (err) {
      console.error(err);
      await dialog.showMessage({
        title: 'Error',
        message: 'Failed to delete level.',
        variant: 'danger',
      });
    }
  };

  const handlePublicSettingsSave = async () => {
    try {
      await handleSavePublicSettings();
      dialog.showToast('Public donation settings saved.');
      queryClient.invalidateQueries({ queryKey: queryKeys.donations.all });
    } catch (err) {
      console.error(err);
      await dialog.showMessage({
        title: 'Error',
        message: 'Failed to save public donation settings.',
        variant: 'danger',
      });
    }
  };

  const columns = useMemo(
    () => createDonationColumns(timezone, handleRefund),
    [timezone, handleRefund]
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Donations & Giving"
        description="Monitor your choir's incoming donations, analyze giving statistics, and manage public donation portal settings and recognition tiers."
        actions={
          <>
            {activeTab === 'history' && (
              <Button
                variant="secondary"
                onClick={handleExportCSV}
                disabled={sortedDonations.length === 0}
                title="Export CSV"
                icon={'⬇️'}
              >
                <span className="hidden md:inline">Export CSV</span>
              </Button>
            )}
            {activeTab === 'levels' && (
              <Button
                variant="primary"
                className="animate-pulse-once"
                onClick={() => openLevelModal()}
                title="Add Level"
                icon={'➕'}
              >
                <span className="hidden md:inline">Add Level</span>
              </Button>
            )}
          </>
        }
      />

      <TabGroup
        value={activeTab}
        onTabChange={(name) => setActiveTab(name as 'history' | 'levels')}
      >
        <Tab panel="history">Donation History</Tab>
        <Tab panel="levels">Tiers & Page Settings</Tab>

        <TabPanel name="history">
          <div className="flex flex-col gap-6">
            <DonationStatsCards
              count={filteredStats.count}
              totalCents={filteredStats.total}
              avgCents={filteredStats.avg}
            />

            <AppCard noPadding>
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="text-lg font-bold text-slate-800">Donations Register</h3>
              </div>
              <div className="flex flex-col gap-4 p-6">
                <DonationFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  startDate={startDate}
                  onStartDateChange={setStartDate}
                  endDate={endDate}
                  onEndDateChange={setEndDate}
                  sortBy={sortBy}
                  onSortChange={(val) => setSortBy(val as 'amount' | 'name' | 'date')}
                  onClearFilters={handleClearFilters}
                  hasActiveFilters={hasActiveFilters}
                />

                <DataTable
                  columns={columns}
                  data={sortedDonations}
                  isLoading={loading}
                  emptyState={{
                    title: 'No Donations Found',
                    description:
                      searchQuery || startDate || endDate
                        ? 'No gifts match your search/filter criteria.'
                        : 'No donation records are available yet.',
                    icon: '💝',
                    action:
                      searchQuery || startDate || endDate ? (
                        <Button
                          variant="secondary"
                          onClick={handleClearFilters}
                          size="small"
                          className="shrink-0 whitespace-nowrap"
                        >
                          Reset Filters
                        </Button>
                      ) : undefined,
                  }}
                  pageSize={25}
                  paginationLabel="donations"
                  renderMobileCard={(d) => (
                    <DonationMobileCard donation={d} timezone={timezone} onRefund={handleRefund} />
                  )}
                />
              </div>
            </AppCard>
          </div>
        </TabPanel>

        <TabPanel name="levels">
          {loading && !settings ? (
            <div className="flex justify-center p-8">
              <span className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
              <PortalConfigCard
                buttonText={portalButtonText}
                description={portalDescription}
                onChangeButtonText={setPortalButtonText}
                onChangeDescription={setPortalDescription}
                onSave={handlePublicSettingsSave}
                isSaving={saving}
              />

              <DonorLevelGrid
                levels={settings?.levels ?? []}
                onEdit={(level) => openLevelModal(level)}
                onDelete={handleLevelDelete}
                onAdd={() => openLevelModal()}
              />
            </div>
          )}
        </TabPanel>
      </TabGroup>

      <DonorLevelModal
        isOpen={isModalOpen}
        onClose={closeModal}
        editingLevel={!!editingLevel}
        label={levelLabel}
        onLabelChange={setLevelLabel}
        amount={levelAmount}
        onAmountChange={setLevelAmount}
        benefit={levelBenefit}
        onBenefitChange={setLevelBenefit}
        onSave={handleLevelSave}
        isSaving={saving}
      />
    </div>
  );
}
