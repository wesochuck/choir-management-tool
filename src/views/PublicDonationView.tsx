import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { donationService, type DonationLevel } from '../services/donationService';
import { AppCard } from '../components/common/AppCard';
import PublicLogo from '../components/common/PublicLogo';
import { useDocumentTitle, useChoirName } from '../hooks/useDocumentTitle';
import './PublicForms.css';

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
      <div className="flex-col pub-style-1">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  const effectiveAmount = getEffectiveAmount();

  return (
    <div className="flex-col pub-style-30">
      <PublicLogo />
      <AppCard className="pub-style-3">
        <div className="flex-col pub-style-4">
          <Link to="/tickets" className="btn btn-ghost btn-sm pub-style-5">← Back to Concerts</Link>
          <div className="flex-col pub-style-31">
            {choirName && <span className="text-xs text-muted pub-style-32">{choirName}</span>}
            <h1 className="text-display pub-style-6">Support Our Music</h1>
            <p className="text-body pub-style-6">Your tax-deductible contribution helps us keep the music playing.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-col pub-style-22 pub-mt-lg">
          {error && <p className="pub-style-27">{error}</p>}

          <div className="flex-col pub-style-19">
            <label className="text-label">Select a Donation Level</label>
            <div className="pub-style-25">
              {levels.map(level => (
                <div 
                  key={level.id}
                  className={`pub-slot-label ${selectedLevelId === level.id ? 'pub-slot-label-checked' : ''}`}
                  onClick={() => setSelectedLevelId(level.id)}
                >
                  <div className="flex-col pub-flex-1">
                    <span className="pub-fw-600">{level.label}</span>
                    {level.benefit && <span className="text-xs text-muted">{level.benefit}</span>}
                  </div>
                  <span className="pub-fw-700">${level.amount}</span>
                </div>
              ))}
              <div 
                className={`pub-slot-label ${selectedLevelId === 'custom' ? 'pub-slot-label-checked' : ''}`}
                onClick={() => setSelectedLevelId('custom')}
              >
                <div className="flex-col pub-flex-1">
                  <span className="pub-fw-600">Custom Amount</span>
                </div>
              </div>
            </div>
          </div>

          {selectedLevelId === 'custom' && (
            <div className="flex-col pub-style-19">
              <label className="text-label">Custom Donation Amount ($)</label>
              <input
                type="number"
                min="5"
                step="0.01"
                required
                placeholder="0.00"
                className="card pub-input pub-h-44"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
              />
            </div>
          )}

          <div className="flex-col pub-style-19">
            <label className="text-label">Your Name</label>
            <input
              type="text"
              required
              placeholder="Full Name"
              className="card pub-input pub-h-44"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="flex-responsive pub-style-23">
            <div className="flex-col pub-style-24">
              <label className="text-label">Email Address</label>
              <input
                type="email"
                required
                placeholder="email@example.com"
                className="card pub-input pub-h-44"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="flex-col pub-style-24">
              <label className="text-label">Confirm Email</label>
              <input
                type="email"
                required
                placeholder="Confirm Email"
                className="card pub-input pub-h-44"
                value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-col pub-style-19">
            <label className="text-label">Tribute Information (Optional)</label>
            <div className="flex-responsive pub-style-23">
              <select 
                className="card pub-select pub-flex-1"
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
                  className="card pub-input pub-flex-2 pub-h-44"
                  value={tributeName}
                  onChange={e => setTributeName(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="flex-row pub-style-40 pub-align-center">
            <input
              id="isAnonymous"
              type="checkbox"
              className="pub-checkbox-marketing"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
            />
            <label htmlFor="isAnonymous" className="pub-style-41">
              <span className="text-sm pub-style-42">
                I wish to remain anonymous.
              </span>
            </label>
          </div>

          <div className="card flex-col pub-style-37">
            <div className="flex-row pub-style-39 pub-no-border pub-no-margin pub-no-padding">
              <span>Total Donation</span>
              <span>${effectiveAmount.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || effectiveAmount < 5}
            className="btn btn-primary btn-lg pub-style-44"
          >
            {submitting ? "Opening Secure Checkout…" : `Donate $${effectiveAmount.toFixed(2)}`}
          </button>

          <p className="text-xs text-muted pub-text-center pub-no-margin">
            Secure payment processing provided by Stripe.
          </p>
        </form>
      </AppCard>
    </div>
  );
}
