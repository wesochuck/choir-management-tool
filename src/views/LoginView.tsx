import React, { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import './LoginView.css';

type LoginMode = 'otp' | 'password';
type OtpStep = 'request' | 'verify';

export default function LoginView() {
  useDocumentTitle('Login');
  const navigate = useNavigate();

  // General states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState<LoginMode>('otp');
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // OTP specific states
  const [otpStep, setOtpStep] = useState<OtpStep>('request');
  const [otpId, setOtpId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Active OTP validity timer (30 mins)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0 && otpStep === 'verify') {
      setError('Login code has expired. Please request a new one.');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown, otpStep]);

  // Active resend throttling cooldown (60s)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Switch helper resets
  const handleSwitchMode = (mode: LoginMode) => {
    setLoginMode(mode);
    setIsForgotMode(false);
    setError('');
    setResetSuccess('');
    setOtpStep('request');
    setOtpCode('');
    setPassword('');
  };

  // Traditional Password Authentication
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await pb.collection('users').authWithPassword(email.trim().toLowerCase(), password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  // Traditional Password Reset Request
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResetSuccess('');

    try {
      await pb.collection('users').requestPasswordReset(email.trim().toLowerCase());
      setResetSuccess('A password reset link has been sent to your email.');
      setEmail('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request password reset. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Request Code Dispatch
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await pb.collection('users').requestOTP(email.trim().toLowerCase());
      setOtpId(result.otpId);
      setOtpStep('verify');
      setCountdown(1800); // 30 minutes in seconds
      setResendCooldown(60); // 60s resend lock
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No account found with this email, or failed to send login code.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Resend Code
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setError('');
    setOtpCode('');
    
    try {
      const result = await pb.collection('users').requestOTP(email.trim().toLowerCase());
      setOtpId(result.otpId);
      setCountdown(1800);
      setResendCooldown(60);
      setResetSuccess('A fresh 6-digit login code has been sent to your email.');
      setTimeout(() => setResetSuccess(''), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend code. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Verification Submission
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await pb.collection('users').authWithOTP(otpId, otpCode.trim());
      navigate('/');
    } catch {
      setError('Invalid or expired login code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-card-container">
      <div className="login-box">
        <h1 className="login-header-title">
          {isForgotMode ? 'Reset Password' : 'Singer Portal'}
        </h1>

        {/* Tab Controls (Only shown when not in Forgot Mode or in the active Verification stage of OTP) */}
        {!isForgotMode && otpStep === 'request' && (
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab-btn ${loginMode === 'otp' ? 'active' : ''}`}
              onClick={() => handleSwitchMode('otp')}
            >
              Email Code
            </button>
            <button
              type="button"
              className={`login-tab-btn ${loginMode === 'password' ? 'active' : ''}`}
              onClick={() => handleSwitchMode('password')}
            >
              Password
            </button>
          </div>
        )}

        {/* FORGOT PASSWORD FORM */}
        {isForgotMode ? (
          <form onSubmit={handleRequestReset} className="flex-col login-fade-in" style={{ gap: 'var(--space-lg)' }}>
            <p className="text-muted text-sm" style={{ margin: 0, textAlign: 'center' }}>
              Enter your email address and we'll send you a custom link to reset your password.
            </p>

            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label" htmlFor="forgot-email">Email Address</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="card"
                style={{ padding: '0 12px', height: '44px', width: '100%', border: '1px solid var(--border)' }}
                placeholder="e.g. singer@choir.org"
              />
            </div>

            {error && <p className="text-xs" style={{ color: 'var(--color-danger-text)', margin: 0 }}>{error}</p>}
            {resetSuccess && <p className="text-xs" style={{ color: 'var(--primary)', margin: 0, fontWeight: '600' }}>{resetSuccess}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'var(--space-xs)' }}
            >
              {isLoading ? 'Sending reset link...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'center', textDecoration: 'underline', cursor: 'pointer', height: 'auto', padding: 0 }}
              onClick={() => setIsForgotMode(false)}
            >
              ← Back to Login
            </button>
          </form>
        ) : (
          /* ACTIVE LOGIN MODE */
          <div>
            {/* OTP WORKFLOW */}
            {loginMode === 'otp' && (
              <div className="login-fade-in">
                {otpStep === 'request' ? (
                  /* Step 1: Request OTP Code */
                  <form onSubmit={handleRequestOTP} className="flex-col" style={{ gap: 'var(--space-lg)' }}>
                    <p className="text-muted text-sm" style={{ margin: 0, textAlign: 'center' }}>
                      Sign in securely without a password. We'll email you a 6-digit login code.
                    </p>
                    <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                      <label className="text-label" htmlFor="otp-email">Email Address</label>
                      <input
                        id="otp-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="card"
                        style={{ padding: '0 12px', height: '44px', width: '100%', border: '1px solid var(--border)' }}
                        placeholder="singer@choir.org"
                      />
                    </div>
                    {error && <p className="text-xs" style={{ color: 'var(--color-danger-text)', margin: 0 }}>{error}</p>}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: 'var(--space-xs)' }}
                    >
                      {isLoading ? 'Sending Login Code...' : 'Send Login Code'}
                    </button>
                  </form>
                ) : (
                  /* Step 2: Verification Code Input */
                  <form onSubmit={handleVerifyOTP} className="flex-col" style={{ gap: 'var(--space-lg)' }}>
                    <div className="otp-sent-banner">
                      <p>
                        A 6-digit login code has been sent to <strong>{email}</strong>
                      </p>
                    </div>

                    <div className="otp-code-input-container">
                      <label className="text-label" htmlFor="otp-code">Enter 6-Digit Login Code</label>
                      <input
                        id="otp-code"
                        type="text"
                        maxLength={6}
                        pattern="\d*"
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        required
                        placeholder="000000"
                        className="otp-code-field"
                      />
                      
                      <div className="otp-timer-hud">
                        <span>
                          Code expires in: <span className="timer-countdown">{formatCountdown(countdown)}</span>
                        </span>
                        
                        {resendCooldown > 0 ? (
                          <span>Resend in {resendCooldown}s</span>
                        ) : (
                          <button
                            type="button"
                            className="resend-action-link"
                            onClick={handleResendOTP}
                            disabled={isLoading}
                          >
                            Resend Code
                          </button>
                        )}
                      </div>
                    </div>

                    {error && <p className="text-xs" style={{ color: 'var(--color-danger-text)', margin: 0 }}>{error}</p>}
                    {resetSuccess && <p className="text-xs" style={{ color: 'var(--primary)', margin: 0, fontWeight: '600' }}>{resetSuccess}</p>}

                    <button
                      type="submit"
                      disabled={isLoading || countdown <= 0}
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: 'var(--space-xs)' }}
                    >
                      {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                    </button>

                    <button
                      type="button"
                      className="back-to-input-btn"
                      onClick={() => {
                        setOtpStep('request');
                        setOtpCode('');
                        setError('');
                      }}
                    >
                      Edit Email Address
                    </button>

                    <div className="otp-back-to-password">
                      <button
                        type="button"
                        className="otp-back-to-password-link"
                        onClick={() => handleSwitchMode('password')}
                      >
                        Sign in with Password instead
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TRADITIONAL PASSWORD WORKFLOW */}
            {loginMode === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="flex-col login-fade-in" style={{ gap: 'var(--space-lg)' }}>
                <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <label className="text-label" htmlFor="login-email">Email Address</label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="card"
                    style={{ padding: '0 12px', height: '44px', width: '100%', border: '1px solid var(--border)' }}
                    placeholder="e.g. singer@choir.org"
                  />
                </div>
                <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="text-label" htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{
                        padding: 0,
                        height: 'auto',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setIsForgotMode(true);
                        setError('');
                        setResetSuccess('');
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="card"
                    style={{ padding: '0 12px', height: '44px', width: '100%', border: '1px solid var(--border)' }}
                  />
                </div>
                {error && <p className="text-xs" style={{ color: 'var(--color-danger-text)', margin: 0 }}>{error}</p>}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 'var(--space-md)' }}
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
