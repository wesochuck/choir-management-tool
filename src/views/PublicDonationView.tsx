import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { donationService } from '../services/donationService';
import { AppCard } from '../components/common/AppCard';
import { PublicBrandingWrapper } from '../components/common/PublicBrandingWrapper';
import { useDocumentTitle, useChoirName } from '../hooks/useDocumentTitle';
import { Button, Select, Input } from '../components/ui';
import { queryKeys } from '../lib/queryKeys';

export default function PublicDonationView() {
  useDocumentTitle('Support Our Music');
  const { choirName } = useChoirName();
  
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
  const [submitting, setSubmitting] = useState(false);

  const getEffectiveAmount = () => {
    if (selectedLevelId === 'custom') {
      return parseFloat(customAmount) || 0;
    }
    const level = levels.find(l => l.id === selectedLevelId);
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

    setSubmitting(true);
    try {
      const session = await donationService.createDonationSession({
        amountCents: Math.round(amount * 100),
        email: email.trim(),
        name: name.trim(),
        tributeType,
        tributeName: tributeName.trim(),
        isAnonymous
      });

      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('Stripe Checkout URL not returned');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Stripe redirection failed.');
      setSubmitting(false);
    }
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
          <Button as={Link} to="/tickets" variant="outline" size="small" className="self-start">← Back to Concerts</Button>
          <div className="flex flex-col gap-0.5">
            {choirName && <span className="text-xs font-bold tracking-wider text-text-muted uppercase">{choirName}</span>}
            <h1 className="text-display m-0">Support Our Music</h1>
            <p className="text-body m-0">Your tax-deductible contribution helps us keep the music playing.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
          {error && <p className="m-0 text-danger-text">{error}</p>}

          <div className="flex flex-col gap-1">
            <label className="text-label">Select a Donation Level</label>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 rounded-lg border border-border bg-neutral-100 p-4">
              {levels.map(level => (
                <div 
                  key={level.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-sm border p-3 transition-all select-none ${selectedLevelId === level.id ? 'border-primary bg-[rgba(74,117,89,0.05)]' : 'border-border bg-surface'}`}
                  onClick={() => setSelectedLevelId(level.id)}
                >
                  <div className="flex flex-1 flex-col">
                    <span className="font-semibold">{level.label}</span>
                    {level.benefit && <span className="text-xs text-text-muted">{level.benefit}</span>}
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
                onChange={e => setCustomAmount(e.target.value)}
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
              onChange={e => setName(e.target.value)}
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
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-label">Confirm Email</label>
              <Input
                type="email"
                required
                placeholder="Confirm Email"
                
                value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label">Tribute Information (Optional)</label>
            <div className="flex flex-col gap-4 md:flex-row">
              <Select 
                className="h-11 flex-1 rounded-md border border-border bg-surface px-3 focus:border-primary"
                value={tributeType}
                onChange={e => setTributeType(e.target.value as 'none' | 'memory' | 'honor')}
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
                  onChange={e => setTributeName(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="mt-1 flex flex-row items-center gap-4 rounded-lg border border-border bg-neutral-100 p-4">
            <input
              id="isAnonymous"
              type="checkbox"
              className="size-[18px] cursor-pointer accent-primary"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
            />
            <label htmlFor="isAnonymous" className="flex flex-1 cursor-pointer flex-col gap-0.5 select-none">
              <span className="text-sm leading-tight font-semibold text-text">
                I wish to remain anonymous.
              </span>
            </label>
          </div>

          <div className="flex w-full flex-col gap-1 rounded-xl border border-border bg-neutral-100 p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="m-0 mt-0 flex flex-row justify-between border-t-0 border-none p-0 pt-0 font-bold">
              <span>Total Donation</span>
              <span>${effectiveAmount.toFixed(2)}</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting || effectiveAmount < 5}
            className="h-12 w-full font-semibold"
            variant="primary"
          >
            {submitting ? "Opening Secure Checkout…" : `Donate $${effectiveAmount.toFixed(2)}`}
          </Button>

          <p className="m-0 text-center text-xs text-text-muted">
            Secure payment processing provided by Stripe.
          </p>
        </form>
      </AppCard>
    </PublicBrandingWrapper>
  );
}
