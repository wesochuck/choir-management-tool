import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { donationService, type DonationLevel } from '../services/donationService';
import { AppCard } from '../components/common/AppCard';
import PublicLogo from '../components/common/PublicLogo';
import { useDocumentTitle, useChoirName } from '../hooks/useDocumentTitle';

export default function PublicDonationView() {
  useDocumentTitle('Support Our Music');
  const { choirName } = useChoirName();
  
  const [levels, setLevels] = useState<DonationLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedLevelId, setSelectedLevelId] = useState<string | 'custom'>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [tributeType, setTributeType] = useState<'none' | 'memory' | 'honor'>('none');
  const [tributeName, setTributeName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await donationService.getDonationSettings();
        setLevels(settings.levels);
        if (settings.levels.length > 0) {
          setSelectedLevelId(settings.levels[0].id);
        } else {
          setSelectedLevelId('custom');
        }
      } catch {
        setError('Failed to load donation settings.');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

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
    <div className="flex min-h-screen w-screen flex-col items-center justify-start p-4">
      <PublicLogo />
      <AppCard className="w-full max-w-[720px]">
        <div className="flex flex-col gap-2">
          <Link to="/tickets" className="btn btn-ghost btn-sm self-start">← Back to Concerts</Link>
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
            <div className="bg-neutral-100 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 rounded-lg border border-border p-4">
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
              <input
                type="number"
                min="5"
                step="0.01"
                required
                placeholder="0.00"
                className="card h-11 px-3"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-label">Your Name</label>
            <input
              type="text"
              required
              placeholder="Full Name"
              className="card h-11 px-3"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-label">Email Address</label>
              <input
                type="email"
                required
                placeholder="email@example.com"
                className="card h-11 px-3"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-label">Confirm Email</label>
              <input
                type="email"
                required
                placeholder="Confirm Email"
                className="card h-11 px-3"
                value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label">Tribute Information (Optional)</label>
            <div className="flex flex-col gap-4 md:flex-row">
              <select 
                className="card h-11 flex-1 px-3"
                value={tributeType}
                onChange={e => setTributeType(e.target.value as 'none' | 'memory' | 'honor')}
              >
                <option value="none">No Tribute</option>
                <option value="memory">In Memory Of</option>
                <option value="honor">In Honor Of</option>
              </select>
              {tributeType !== 'none' && (
                <input
                  type="text"
                  required
                  placeholder="Honoree Name"
                  className="card h-11 flex-[2] px-3"
                  value={tributeName}
                  onChange={e => setTributeName(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="bg-neutral-100 mt-1 flex flex-row items-center gap-4 rounded-lg border border-border p-4">
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

          <div className="card bg-neutral-100 flex w-full flex-col gap-1 p-4">
            <div className="m-0 mt-0 flex flex-row justify-between border-t-0 border-none p-0 pt-0 font-bold">
              <span>Total Donation</span>
              <span>${effectiveAmount.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || effectiveAmount < 5}
            className="btn btn-primary btn-lg h-12 w-full font-semibold"
          >
            {submitting ? "Opening Secure Checkout…" : `Donate $${effectiveAmount.toFixed(2)}`}
          </button>

          <p className="m-0 text-center text-xs text-text-muted">
            Secure payment processing provided by Stripe.
          </p>
        </form>
      </AppCard>
    </div>
  );
}
