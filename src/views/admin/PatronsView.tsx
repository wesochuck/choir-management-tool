import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { profileService, type Profile, type ProfileInput } from '../../services/profileService';
import { donationService } from '../../services/donationService';
import { ticketService } from '../../services/ticketService';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useProfiles } from '../../hooks/useProfiles';
import { formatInTimezone } from '../../lib/timezone';
import { getFirstName, getLastName } from '../../lib/stringUtils';
import { safeLocalStorage } from '../../lib/storage';
import { SingerModal } from '../../components/admin/SingerModal';
import { AppCard } from '../../components/common/AppCard';
import { Button, FormField, Badge, Select, Input, DataTable } from '../../components/ui';
import type { ColumnDef } from '../../components/ui';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';

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
  const queryClient = useQueryClient();
  const { profiles } = useProfiles();

  const profileSaveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProfileInput }) =>
      profileService.updateProfile(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all }),
  });

  const profileDeleteMutation = useMutation({
    mutationFn: (id: string) => profileService.deleteProfile(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all }),
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'ltv' | 'name' | 'lastDate'>('ltv');
  const [startDate, setStartDate] = useState(
    safeLocalStorage.getItem(STORAGE_KEY_START_DATE) || ''
  );
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

  // ── Data queries ──
  const donationsQuery = useQuery({
    queryKey: queryKeys.donations.paid,
    queryFn: () => donationService.getDonations('status = "paid"'),
  });

  const purchasesQuery = useQuery({
    queryKey: queryKeys.purchases.list,
    queryFn: ticketService.getAllPurchases,
  });

  const patronData = useMemo(() => {
    const donations = donationsQuery.data ?? [];
    const purchases = purchasesQuery.data ?? [];

    const paidPurchases = purchases.filter((p) => p.status === 'paid');
    const patronMap = new Map<string, PatronData>();

    const processTransaction = (
      profileId: string | undefined,
      amountCents: number,
      date: string
    ) => {
      if (!profileId) return;
      const profile = profiles.find((p) => p.id === profileId);
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
          isSinger: !!profile.voicePart,
        });
      }
    };

    donations.forEach((d) => processTransaction(d.profile, d.amountPaidCents, d.created));
    paidPurchases.forEach((p) => processTransaction(p.profile, p.amountPaidCents, p.created));

    return Array.from(patronMap.values());
  }, [profiles, donationsQuery.data, purchasesQuery.data]);

  const refresh = useCallback(() => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.donations.paid }),
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.list }),
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all }),
    ]);
  }, [queryClient]);

  const isLoading = donationsQuery.isLoading || purchasesQuery.isLoading;

  const filteredPatrons = useMemo(() => {
    const result = patronData.filter((p) => {
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
        return (
          new Date(b.lastTransactionDate).getTime() - new Date(a.lastTransactionDate).getTime()
        );
      }
      return 0;
    });

    return result;
  }, [patronData, searchQuery, sortBy, startDate, endDate]);

  const filteredStats = useMemo(() => {
    const count = filteredPatrons.length;
    const totalLtvCents = filteredPatrons.reduce((acc, p) => acc + p.ltvCents, 0);
    return { count, totalLtvCents };
  }, [filteredPatrons]);

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
      await profileSaveMutation.mutateAsync({ id: selectedPatron.id, data });
      refresh();
    }
  };

  const handleDeleteProfile = async (profile: Profile) => {
    await profileDeleteMutation.mutateAsync(profile.id);
    refresh();
  };

  const columns: ColumnDef<PatronData>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorFn: (p) => p.profile.name,
      enableSorting: false,
      meta: {
        cardSection: 0,
        cardSide: 'left',
      },
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge tone={row.original.isSinger ? 'rehearsal' : 'neutral'}>
          {row.original.isSinger ? 'Singer' : 'Patron'}
        </Badge>
      ),
      enableSorting: false,
      meta: {
        cardSection: 0,
        cardSide: 'right',
      },
    },
    {
      id: 'email',
      header: 'Email',
      accessorFn: (p) => p.profile.expand?.user?.email || 'No email',
      enableSorting: false,
      meta: {
        cardSection: 1,
        cardSide: 'left',
      },
    },
    {
      id: 'ltv',
      header: 'LTV',
      cell: ({ row }) => (
        <span className="font-extrabold text-emerald-700">
          ${(row.original.ltvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
      enableSorting: false,
      meta: {
        align: 'right',
        cardSection: 1,
        cardSide: 'right',
        cardLabel: 'LTV',
      },
    },
    {
      id: 'lastDate',
      header: 'Last Transaction',
      cell: ({ row }) =>
        formatInTimezone(row.original.lastTransactionDate, 'America/New_York', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      enableSorting: false,
      meta: {
        cardSection: 1,
        cardSide: 'left',
        cardLabel: 'Last:',
      },
    },
    {
      id: 'orders',
      header: 'Orders',
      accessorFn: (p) => p.transactionCount,
      enableSorting: false,
      meta: {
        align: 'right',
        cardSection: 1,
        cardSide: 'right',
        cardLabel: 'Orders:',
      },
    },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Patrons Dashboard"
        description="View lifetime value and message your donors and ticket buyers"
      />

      {/* Stats Analytics Dashboard */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Patrons Count Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-slate-400 transition-colors group-hover:bg-slate-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                Patrons Count
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                {filteredStats.count}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-slate-500 transition-colors group-hover:bg-slate-100">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total LTV Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-pink-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-pink-500 transition-colors group-hover:bg-pink-600" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold tracking-wider text-pink-500 uppercase">
                Total Lifetime Value
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-pink-600">
                $
                {(filteredStats.totalLtvCents / 100).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="rounded-xl bg-pink-50 p-3 text-pink-500 transition-colors group-hover:bg-pink-100/80">
              <span aria-hidden="true">💵</span>
            </div>
          </div>
        </div>
      </div>

      <AppCard noPadding>
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-800">Patrons Register</h3>
        </div>
        <div className="flex flex-col gap-4 p-6">
          {/* Filter deck */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 md:grid-cols-4">
            <div className="md:col-span-1">
              <FormField label="Search">
                <Input
                  type="text"
                  placeholder="Search patron name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                >
                  <span slot="prefix" className="flex items-center text-slate-400">
                    <svg
                      className="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                </Input>
              </FormField>
            </div>
            <div className="flex flex-row gap-4 md:col-span-2">
              <div className="min-w-0 flex-1">
                <FormField label="From Date">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleSetStartDate(e.target.value)}
                    className="focus:ring-primary block w-full shadow-sm transition-colors outline-none focus:ring-1"
                  />
                </FormField>
              </div>
              <div className="min-w-0 flex-1">
                <FormField label="To Date">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="focus:ring-primary block w-full shadow-sm transition-colors outline-none focus:ring-1"
                  />
                </FormField>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormField label="Sort By">
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'ltv' | 'name' | 'lastDate')}
                  >
                    <option value="ltv">Lifetime Value</option>
                    <option value="name">Name</option>
                    <option value="lastDate">Last Transaction</option>
                  </Select>
                </FormField>
              </div>
              {(searchQuery || startDate || endDate) && (
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="flex h-10 items-center justify-center"
                  title="Reset filters"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </Button>
              )}
            </div>
          </div>

          <div className="flex w-full flex-row items-center justify-between border-b border-slate-200 pb-px">
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <span className="text-sm font-medium text-slate-500">
                  {selectedIds.size} patron{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 pb-1.5">
              <Button
                variant="primary"
                onClick={handleSendMessage}
                disabled={selectedIds.size === 0}
                title="Send Message"
                icon={
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                }
              >
                <span className="hidden md:inline">Send Message</span>
                {selectedIds.size > 0 && <span className="ml-1">({selectedIds.size})</span>}
              </Button>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredPatrons}
            isLoading={isLoading}
            emptyState={{
              title: 'No Patrons Found',
              description:
                searchQuery || startDate || endDate
                  ? 'No patrons match your search/filter criteria.'
                  : 'No patron records are available yet.',
              icon: '👥',
              action:
                searchQuery || startDate || endDate ? (
                  <Button variant="secondary" onClick={handleClearFilters} size="small">
                    Reset Filters
                  </Button>
                ) : undefined,
            }}
            enableSelection
            onSelectionChange={(ids) => setSelectedIds(ids)}
            onRowClick={(patron) => handleOpenProfile(patron.profile)}
            manualPagination
            getRowId={(patron) => patron.profile.id}
          />
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
