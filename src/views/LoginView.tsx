import React, { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

type LoginMode = 'otp' | 'password';
type OtpStep = 'request' | 'verify';

export default function LoginView() {
  useDocumentTitle('Login');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState<LoginMode>('otp');
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const [otpStep, setOtpStep] = useState<OtpStep>('request');
  const [otpId, setOtpId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  const handleSwitchMode = (mode: LoginMode) => {
    setLoginMode(mode);
    setIsForgotMode(false);
    setError('');
    setResetSuccess('');
    setOtpStep('request');
    setOtpCode('');
    setPassword('');
  };

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

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await pb.collection('users').requestOTP(email.trim().toLowerCase());
      setOtpId(result.otpId);
      setOtpStep('verify');
      setCountdown(1800);
      setResendCooldown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No account found with this email, or failed to send login code.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="flex flex-col items-center justify-center min-h-screen w-screen p-4 bg-bg">
      <div className="w-full max-w-[min(400px,calc(100vw-32px))] shadow-[0_10px_25px_-5px_rgb(0_0_0_/_5%),0_8px_16px_-6px_rgb(0_0_0_/_3%)] transition-all duration-300 bg-surface rounded-xl border border-border p-8 hover:-translate-y-0.5 hover:shadow-[0_20px_30px_-10px_rgb(91_33_182_/_6%),0_10px_20px_-8px_rgb(0_0_0_/_4%)] hover:border-[rgba(109,40,217,0.2)]">
        <h1 className="text-center text-3xl font-extrabold text-text mb-6 tracking-tight">
          {isForgotMode ? 'Reset Password' : 'Singer Portal'}
        </h1>

        {!isForgotMode && otpStep === 'request' && (
          <div className="flex border-b-2 border-border mb-6 gap-1">
            <button
              type="button"
              className={`flex-1 bg-transparent border-none text-sm font-semibold py-2 cursor-pointer relative transition-all text-center outline-none ${loginMode === 'otp' ? 'text-primary font-bold after:content-[""] after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-sm' : 'text-text-muted hover:text-text'}`}
              onClick={() => handleSwitchMode('otp')}
            >
              Email Code
            </button>
            <button
              type="button"
              className={`flex-1 bg-transparent border-none text-sm font-semibold py-2 cursor-pointer relative transition-all text-center outline-none ${loginMode === 'password' ? 'text-primary font-bold after:content-[""] after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-sm' : 'text-text-muted hover:text-text'}`}
              onClick={() => handleSwitchMode('password')}
            >
              Password
            </button>
          </div>
        )}

        {isForgotMode ? (
          <form onSubmit={handleRequestReset} className="flex flex-col gap-6 animate-login-fade-in">
            <p className="m-0 text-center text-sm text-text-muted leading-relaxed">
              Enter your email address and we'll send you a custom link to reset your password.
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-label" htmlFor="forgot-email">Email Address</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="px-3 h-11 w-full border border-border rounded-lg bg-surface text-text font-sans text-base transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(109,40,217,0.15)] focus:outline-none"
                placeholder="e.g. singer@choir.org"
              />
            </div>

            {error && <p className="text-danger-text text-xs m-0">{error}</p>}
            {resetSuccess && <p className="text-primary text-xs font-semibold m-0">{resetSuccess}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full mt-1"
            >
              {isLoading ? 'Sending reset link...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              className="self-center underline cursor-pointer h-auto p-0 text-xs text-text-muted hover:text-text"
              onClick={() => setIsForgotMode(false)}
            >
              ← Back to Login
            </button>
          </form>
        ) : (
          <div>
            {loginMode === 'otp' && (
              <div className="animate-login-fade-in">
                {otpStep === 'request' ? (
                  <form onSubmit={handleRequestOTP} className="flex flex-col gap-6">
                    <p className="m-0 text-center text-sm text-text-muted leading-relaxed">
                      Sign in securely without a password. We'll email you a 6-digit login code.
                    </p>
                    <div className="flex flex-col gap-1">
                      <label className="text-label" htmlFor="otp-email">Email Address</label>
                      <input
                        id="otp-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="px-3 h-11 w-full border border-border rounded-lg bg-surface text-text font-sans text-base transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(109,40,217,0.15)] focus:outline-none"
                        placeholder="singer@choir.org"
                      />
                    </div>
                    {error && <p className="text-danger-text text-xs m-0">{error}</p>}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn btn-primary w-full mt-1"
                    >
                      {isLoading ? 'Sending Login Code...' : 'Send Login Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="flex flex-col gap-6">
                    <div className="bg-primary-light border-l-4 border-primary px-4 py-2 rounded-r-lg mb-4">
                      <p className="m-0 text-sm text-primary-deep leading-relaxed">
                        A 6-digit login code has been sent to <strong>{email}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 mb-2">
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
                        className="px-4 h-12 w-full border border-border rounded-lg text-xl font-bold tracking-widest text-center bg-bg text-text font-mono transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(109,40,217,0.15)] focus:bg-surface focus:outline-none"
                      />
                      
                      <div className="flex justify-between items-center text-xs text-text-muted mt-1">
                        <span>
                          Code expires in: <span className="font-bold text-primary tabular-nums">{formatCountdown(countdown)}</span>
                        </span>
                        
                        {resendCooldown > 0 ? (
                          <span>Resend in {resendCooldown}s</span>
                        ) : (
                          <button
                            type="button"
                            className="bg-transparent border-none p-0 min-h-0 text-xs font-semibold text-primary underline cursor-pointer h-auto disabled:text-text-muted disabled:no-underline disabled:cursor-not-allowed"
                            onClick={handleResendOTP}
                            disabled={isLoading}
                          >
                            Resend Code
                          </button>
                        )}
                      </div>
                    </div>

                    {error && <p className="text-danger-text text-xs m-0">{error}</p>}
                    {resetSuccess && <p className="text-primary text-xs font-semibold m-0">{resetSuccess}</p>}

                    <button
                      type="submit"
                      disabled={isLoading || countdown <= 0}
                      className="btn btn-primary w-full mt-1"
                    >
                      {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                    </button>

                    <button
                      type="button"
                      className="self-center text-xs text-text-muted bg-transparent border-none cursor-pointer py-1 mt-2 underline hover:text-text transition-colors"
                      onClick={() => {
                        setOtpStep('request');
                        setOtpCode('');
                        setError('');
                      }}
                    >
                      Edit Email Address
                    </button>

                    <div className="flex justify-center mt-4 border-t border-border pt-4">
                      <button
                        type="button"
                        className="text-xs text-primary font-semibold bg-transparent border-none cursor-pointer underline p-0 hover:text-primary-deep"
                        onClick={() => handleSwitchMode('password')}
                      >
                        Sign in with Password instead
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {loginMode === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-6 animate-login-fade-in">
                <div className="flex flex-col gap-1">
                  <label className="text-label" htmlFor="login-email">Email Address</label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="px-3 h-11 w-full border border-border rounded-lg bg-surface text-text font-sans text-base transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(109,40,217,0.15)] focus:outline-none"
                    placeholder="e.g. singer@choir.org"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-row justify-between items-center">
                    <label className="text-label" htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      className="p-0 border-none bg-none h-auto min-h-0 text-xs text-text-muted underline cursor-pointer hover:text-text"
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
                    className="px-3 h-11 w-full border border-border rounded-lg bg-surface text-text font-sans text-base transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(109,40,217,0.15)] focus:outline-none"
                  />
                </div>
                {error && <p className="text-danger-text text-xs m-0">{error}</p>}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary w-full mt-4"
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
