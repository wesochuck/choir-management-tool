import { useMemo, useState } from 'react';
import type { DonationRecord } from '../../../services/donationService';
import { getFirstName, getLastName } from '../../../lib/stringUtils';
import { safeLocalStorage } from '../../../lib/storage';

const STORAGE_KEY_START_DATE = 'donations_view_filter_start_date';

export function useDonationFilters(donations: DonationRecord[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(
    safeLocalStorage.getItem(STORAGE_KEY_START_DATE) || ''
  );
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

  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
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
        return getFirstName(a.donorName)
          .toLowerCase()
          .localeCompare(getFirstName(b.donorName).toLowerCase());
      }
      if (sortBy === 'name') {
        const lastA = getLastName(a.donorName).toLowerCase();
        const lastB = getLastName(b.donorName).toLowerCase();
        if (lastA !== lastB) return lastA.localeCompare(lastB);
        return getFirstName(a.donorName)
          .toLowerCase()
          .localeCompare(getFirstName(b.donorName).toLowerCase());
      }
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
    return sorted;
  }, [filteredDonations, sortBy]);

  const filteredStats = useMemo(() => {
    const paidDonations = filteredDonations.filter((d) => d.status === 'paid');
    const count = paidDonations.length;
    const total = paidDonations.reduce((acc, d) => acc + d.amountPaidCents, 0);
    const avg = count > 0 ? total / count : 0;
    return { count, total, avg };
  }, [filteredDonations]);

  const hasActiveFilters = !!(searchQuery || startDate || endDate);

  return {
    searchQuery,
    setSearchQuery,
    startDate,
    setStartDate: handleSetStartDate,
    endDate,
    setEndDate,
    sortBy,
    setSortBy,
    handleClearFilters,
    sortedDonations,
    filteredStats,
    hasActiveFilters,
  };
}
