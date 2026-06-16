import React, { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Button, Input } from '../components/ui';

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
    <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-bg p-4">
      <div className="w-full max-w-[min(400px,calc(100vw-32px))] rounded-xl border border-border bg-surface p-8 shadow-[0_10px_25px_-5px_rgb(0_0_0_/_5%),0_8px_16px_-6px_rgb(0_0_0_/_3%)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(109,40,217,0.2)] hover:shadow-[0_20px_30px_-10px_rgb(91_33_182_/_6%),0_10px_20px_-8px_rgb(0_0_0_/_4%)]">
        <h1 className="mb-6 text-center text-3xl font-extrabold tracking-tight text-text">
          {isForgotMode ? 'Reset Password' : 'Singer Portal'}
        </h1>

        {!isForgotMode && otpStep === 'request' && (
          <div className="mb-6 flex gap-1 border-b-2 border-border">
            <button
              type="button"
              className={`relative flex-1 cursor-pointer border-none bg-transparent py-2 text-center text-sm font-semibold transition-all outline-none ${loginMode === 'otp' ? 'font-bold text-primary after:absolute after:inset-x-0 after:bottom-[-2px] after:h-0.5 after:rounded-sm after:bg-primary after:content-[""]' : 'text-text-muted hover:text-text'}`}
              onClick={() => handleSwitchMode('otp')}
            >
              Email Code
            </button>
            <button
              type="button"
              className={`relative flex-1 cursor-pointer border-none bg-transparent py-2 text-center text-sm font-semibold transition-all outline-none ${loginMode === 'password' ? 'font-bold text-primary after:absolute after:inset-x-0 after:bottom-[-2px] after:h-0.5 after:rounded-sm after:bg-primary after:content-[""]' : 'text-text-muted hover:text-text'}`}
              onClick={() => handleSwitchMode('password')}
            >
              Password
            </button>
          </div>
        )}

        {isForgotMode ? (
          <form onSubmit={handleRequestReset} className="flex animate-login-fade-in flex-col gap-6">
            <p className="m-0 text-center text-sm leading-relaxed text-text-muted">
              Enter your email address and we'll send you a custom link to reset your password.
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-label" htmlFor="forgot-email">Email Address</label>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
               
                placeholder="e.g. singer@choir.org"
              />
            </div>

            {error && <p className="m-0 text-xs text-danger-text">{error}</p>}
            {resetSuccess && <p className="m-0 text-xs font-semibold text-primary">{resetSuccess}</p>}

            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
              className="mt-1 w-full"
            >
              {isLoading ? 'Sending reset link...' : 'Send Reset Link'}
            </Button>

            <button
              type="button"
              className="h-auto cursor-pointer self-center p-0 text-xs text-text-muted underline hover:text-text"
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
                    <p className="m-0 text-center text-sm leading-relaxed text-text-muted">
                      Sign in securely without a password. We'll email you a 6-digit login code.
                    </p>
                    <div className="flex flex-col gap-1">
                      <label className="text-label" htmlFor="otp-email">Email Address</label>
                      <Input
                        id="otp-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                       
                        placeholder="singer@choir.org"
                      />
                    </div>
                    {error && <p className="m-0 text-xs text-danger-text">{error}</p>}
                    <Button
                      type="submit"
                      disabled={isLoading}
                      variant="primary"
                      className="mt-1 w-full"
                    >
                      {isLoading ? 'Sending Login Code...' : 'Send Login Code'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="flex flex-col gap-6">
                    <div className="mb-4 rounded-r-lg border-l-4 border-primary bg-primary-light px-4 py-2">
                      <p className="m-0 text-sm leading-relaxed text-primary-deep">
                        A 6-digit login code has been sent to <strong>{email}</strong>
                      </p>
                    </div>

                    <div className="mb-2 flex flex-col gap-1">
                      <label className="text-label" htmlFor="otp-code">Enter 6-Digit Login Code</label>
                      <Input
                        id="otp-code"
                        type="text"
                        maxLength={6}
                        pattern="\d*"
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        required
                        placeholder="000000"
                        className="text-center font-mono text-xl font-bold tracking-widest"
                      />
                      
                      <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
                        <span>
                          Code expires in: <span className="font-bold text-primary tabular-nums">{formatCountdown(countdown)}</span>
                        </span>
                        
                        {resendCooldown > 0 ? (
                          <span>Resend in {resendCooldown}s</span>
                        ) : (
                          <button
                            type="button"
                            className="h-auto min-h-0 cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-primary underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline"
                            onClick={handleResendOTP}
                            disabled={isLoading}
                          >
                            Resend Code
                          </button>
                        )}
                      </div>
                    </div>

                    {error && <p className="m-0 text-xs text-danger-text">{error}</p>}
                    {resetSuccess && <p className="m-0 text-xs font-semibold text-primary">{resetSuccess}</p>}

                    <Button
                      type="submit"
                      disabled={isLoading || countdown <= 0}
                      variant="primary"
                      className="mt-1 w-full"
                    >
                      {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                    </Button>

                    <button
                      type="button"
                      className="mt-2 cursor-pointer self-center border-none bg-transparent py-1 text-xs text-text-muted underline transition-colors hover:text-text"
                      onClick={() => {
                        setOtpStep('request');
                        setOtpCode('');
                        setError('');
                      }}
                    >
                      Edit Email Address
                    </button>

                    <div className="mt-4 flex justify-center border-t border-border pt-4">
                      <button
                        type="button"
                        className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-primary underline hover:text-primary-deep"
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
              <form onSubmit={handlePasswordSubmit} className="flex animate-login-fade-in flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-label" htmlFor="login-email">Email Address</label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                   
                    placeholder="e.g. singer@choir.org"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-row items-center justify-between">
                    <label className="text-label" htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      className="h-auto min-h-0 cursor-pointer border-none bg-none p-0 text-xs text-text-muted underline hover:text-text"
                      onClick={() => {
                        setIsForgotMode(true);
                        setError('');
                        setResetSuccess('');
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                   
                  />
                </div>
                {error && <p className="m-0 text-xs text-danger-text">{error}</p>}
                <Button
                  type="submit"
                  disabled={isLoading}
                  variant="primary"
                  className="mt-4 w-full"
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
