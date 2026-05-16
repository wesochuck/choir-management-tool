import React, { useState } from 'react';
import { pb } from '../lib/pocketbase';
import { useNavigate } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';

export default function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await pb.collection('users').authWithPassword(email, password);
      navigate('/');
    } catch {
      try {
        // If regular user fails, try superuser login
        await pb.collection('_superusers').authWithPassword(email, password);
        navigate('/');
      } catch {
        setError('Invalid email or password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-col" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100vw', padding: 'var(--space-md)', backgroundColor: 'var(--bg)' }}>
      <AppCard style={{ width: '100%', maxWidth: 'min(400px, calc(100vw - 32px))' }}>
        <h1 className="text-display" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>Login</h1>
        <form onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-lg)' }}>
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="card"
              style={{ padding: '0 12px', height: '44px', width: '100%', border: '1px solid var(--border)' }}
            />
          </div>
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="card"
              style={{ padding: '0 12px', height: '44px', width: '100%', border: '1px solid var(--border)' }}
            />
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--color-danger-text)' }}>{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 'var(--space-md)' }}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </AppCard>
    </div>
  );
}
