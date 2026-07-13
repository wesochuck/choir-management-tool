import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { donationService } from '../services/donationService';
import { AppCard } from '../components/common/AppCard';
import { PublicBrandingWrapper } from '../components/common/PublicBrandingWrapper';
import { useDocumentTitle, useChoirName } from '../hooks/useDocumentTitle';
import { Button, Select, Input, Checkbox } from '../components/ui';
import { queryKeys } from '../lib/queryKeys';
import { useSetup } from '../contexts/SetupContext';

export default function PublicDonationView() {
  useDocumentTitle('Support Our Music');
  const { choirName } = useChoirName();
  const { enabledModules } = useSetup();
  const ticketsEnabled = enabledModules.has('ticketSales');

  const [error, setError] = useState('');

  const [selectedLevelId, setSelectedLevelId] = useState<string | 'custom'>('');

  const donationQuery = useQuery({
    queryKey: queryKeys.donations.settings,
    queryFn: () => donationService.getDonationSettings(),
  });

  const levels = donationQuery.data?.levels ?? [];
  const loading = donationQuery.isLoading;

  const levelInitRef = useRef(false);
  useEffect(() => {
    if (!donationQuery.data || levelInitRef.current) return;
    levelInitRef.current = true;
    if (donationQuery.data.levels.length > 0) {
      setSelectedLevelId(donationQuery.data.levels[0].id);
    } else {
      setSelectedLevelId('custom');
    }
  }, [donationQuery.data]);

  useEffect(() => {
    if (donationQuery.isError) {
      setError('Failed to load donation settings.');
    }
  }, [donationQuery.isError]);

  const [customAmount, setCustomAmount] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [tributeType, setTributeType] = useState<'none' | 'memory' | 'honor'>('none');
  const [tributeName, setTributeName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const createSessionMutation = useMutation({
    mutationFn: (data: {
      amountCents: number;
      email: string;
      name: string;
      tributeType: string;
      tributeName: string;
      isAnonymous: boolean;
      marketingOptIn: boolean;
    }) => donationService.createDonationSession(data),
    onSuccess: (result) => {
      if (result.url) {
        window.location.assign(result.url);
      } else {
        setError('Stripe Checkout URL not returned');
      }
    },
    onError: (err: Error) => {
      setError(err.message || 'Stripe redirection failed.');
    },
  });

  const getEffectiveAmount = () => {
    if (selectedLevelId === 'custom') {
      return parseFloat(customAmount) || 0;
    }
    const level = levels.find((l) => l.id === selectedLevelId);
    return level ? level.amount : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = getEffectiveAmount();
    if (amount < 5) {
      setError('Minimum donation amount is $5.00');
      return;
    }

    if (email.trim() !== confirmEmail.trim()) {
      setError('Email addresses must match.');
      return;
    }

    await createSessionMutation.mutateAsync({
      amountCents: Math.round(amount * 100),
      email: email.trim(),
      name: name.trim(),
      tributeType,
      tributeName: tributeName.trim(),
      isAnonymous,
      marketingOptIn,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  const effectiveAmount = getEffectiveAmount();

  return (
    <PublicBrandingWrapper>
      <AppCard className="w-full max-w-[720px]">
        <div className="flex flex-col gap-2">
          {ticketsEnabled && (
            <Button as={Link} to="/tickets" variant="outline" size="small" className="self-start">
              ← Back to Concerts
            </Button>
          )}
          <div className="flex flex-col gap-0.5">
            {choirName && (
              <span className="text-text-muted text-xs font-bold tracking-wider uppercase">
                {choirName}
              </span>
            )}
            <h1 className="text-display m-0">Support Our Music</h1>
            <p className="text-body m-0">
              Your tax-deductible contribution helps us keep the music playing.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
          {error && <p className="text-danger-text m-0">{error}</p>}

          <div className="flex flex-col gap-1">
            <label className="text-label">Select a Donation Level</label>
            <div className="border-border grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 rounded-lg border bg-neutral-100 p-4">
              {levels.map((level) => (
                <div
                  key={level.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-sm border p-3 transition-all select-none ${selectedLevelId === level.id ? 'border-primary bg-[rgba(74,117,89,0.05)]' : 'border-border bg-surface'}`}
                  onClick={() => setSelectedLevelId(level.id)}
                >
                  <div className="flex flex-1 flex-col">
                    <span className="font-semibold">{level.label}</span>
                    {level.benefit && (
                      <span className="text-text-muted text-xs">{level.benefit}</span>
                    )}
                  </div>
                  <span className="font-bold">${level.amount}</span>
                </div>
              ))}
              <div
                className={`flex cursor-pointer items-center gap-2.5 rounded-sm border p-3 transition-all select-none ${selectedLevelId === 'custom' ? 'border-primary bg-[rgba(74,117,89,0.05)]' : 'border-border bg-surface'}`}
                onClick={() => setSelectedLevelId('custom')}
              >
                <div className="flex flex-1 flex-col">
                  <span className="font-semibold">Custom Amount</span>
                </div>
              </div>
            </div>
          </div>

          {selectedLevelId === 'custom' && (
            <div className="flex flex-col gap-1">
              <label className="text-label">Custom Donation Amount ($)</label>
              <Input
                type="number"
                min="5"
                step="0.01"
                required
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-label">Your Name</label>
            <Input
              type="text"
              required
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-label">Email Address</label>
              <Input
                type="email"
                required
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-label">Confirm Email</label>
              <Input
                type="email"
                required
                placeholder="Confirm Email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label">Tribute Information (Optional)</label>
            <div className="flex flex-col gap-4 md:flex-row">
              <Select
                className="flex-1"
                value={tributeType}
                onChange={(e) => setTributeType(e.target.value as 'none' | 'memory' | 'honor')}
              >
                <option value="none">No Tribute</option>
                <option value="memory">In Memory Of</option>
                <option value="honor">In Honor Of</option>
              </Select>
              {tributeType !== 'none' && (
                <Input
                  type="text"
                  required
                  placeholder="Honoree Name"
                  className="flex-[2]"
                  value={tributeName}
                  onChange={(e) => setTributeName(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="border-border mt-1 flex flex-row items-center gap-4 rounded-lg border bg-neutral-100 p-4">
            <Checkbox
              id="isAnonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            >
              I wish to remain anonymous.
            </Checkbox>
          </div>

          <div className="border-border mt-1 flex flex-row items-center gap-4 rounded-lg border bg-neutral-100 p-4">
            <Checkbox
              id="marketingOptIn"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
            >
              Send me updates about upcoming concerts and events.
            </Checkbox>
          </div>

          <div className="border-border flex w-full flex-col gap-1 rounded-xl border bg-neutral-100 p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="m-0 mt-0 flex flex-row justify-between border-t-0 border-none p-0 pt-0 font-bold">
              <span>Total Donation</span>
              <span>${effectiveAmount.toFixed(2)}</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={createSessionMutation.isPending || effectiveAmount < 5}
            className="h-12 w-full font-semibold"
            variant="primary"
          >
            {createSessionMutation.isPending
              ? 'Opening Secure Checkout…'
              : `Donate $${effectiveAmount.toFixed(2)}`}
          </Button>

          <p className="text-text-muted m-0 text-center text-xs">
            Secure payment processing provided by Stripe.
          </p>
        </form>
      </AppCard>
    </PublicBrandingWrapper>
  );
}
