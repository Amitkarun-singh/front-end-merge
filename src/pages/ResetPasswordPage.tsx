import { useState, useEffect, useRef } from 'react';
import './StudentLoginPage.css'; // reuse the same stylesheet
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Lock, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import schools2aiIcon from '@/assets/schools2ai-icon.png';
import { config } from '../../app.config.js';

const API_BASE = config.server;

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login } = useAuth();          // used to store auth state after reset
  const newPwRef = useRef<HTMLInputElement>(null);

  // ── Validation ──────────────────────────────────────────────────────────────
  const minLength = newPassword.length >= 8;
  const pwMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = minLength && pwMatch && !isLoading;

  // Autofocus new-password field on mount
  useEffect(() => {
    newPwRef.current?.focus();
  }, []);

  // Guard: if no tempToken, redirect to /login
  useEffect(() => {
    if (!sessionStorage.getItem('tempToken')) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const tempToken = sessionStorage.getItem('tempToken');
    if (!tempToken) {
      navigate('/login', { replace: true });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/reset-first-time-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 401 = token expired
        if (res.status === 401) {
          sessionStorage.removeItem('tempToken');
          navigate('/login', {
            replace: true,
            state: { sessionExpiredMessage: 'Session expired. Please log in again.' },
          });
          return;
        }
        throw new Error(data.message || 'Password reset failed. Please try again.');
      }

      // Success — treat exactly like a normal login response
      const responseData = data.data || data;
      const accessToken = responseData.accessToken || responseData.token;

      // Persist the real token via AuthContext's internal storage mechanism
      // We trigger the same "login succeeded" path manually:
      if (accessToken) {
        // Re-use login's profile-fetch logic by calling login won't work here
        // (login needs credentials). Instead, directly store via the same key
        // that AuthContext reads from localStorage, then force a page reload.
        const role = responseData.role;
        localStorage.setItem(
          'schools2ai_auth',
          JSON.stringify({ token: accessToken, user: { role } }),
        );
      }

      // Clean up tempToken immediately
      sessionStorage.removeItem('tempToken');

      // Navigate to dashboard — the page reload will hydrate AuthContext
      navigate('/', { replace: true });
      window.location.reload(); // ensure AuthContext re-reads from localStorage
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Requirement row ──────────────────────────────────────────────────────────
  function Requirement({ met, label }: { met: boolean; label: string }) {
    return (
      <div className="flex items-center gap-2" style={{ fontSize: '0.8rem' }}>
        {met
          ? <CheckCircle2 style={{ width: 14, height: 14, color: '#22c55e', flexShrink: 0 }} />
          : <Circle style={{ width: 14, height: 14, color: '#94a3b8', flexShrink: 0 }} />
        }
        <span style={{ color: met ? '#22c55e' : '#94a3b8', transition: 'color 0.2s' }}>
          {label}
        </span>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0f9ff 100%)',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 8px 40px rgba(99,102,241,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        padding: '36px 32px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <img src={schools2aiIcon} alt="Schools2AI" style={{ width: 38, height: 38, borderRadius: 10 }} />
            <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1e1b4b' }}>
              Schools<span style={{ color: '#6366f1' }}>2AI</span>
            </span>
          </div>
          <div style={{
            width: 44, height: 44,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <Lock style={{ width: 20, height: 20, color: '#fff' }} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e1b4b', margin: '0 0 6px' }}>
            Set Your New Password
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
            Welcome! Since this is your first login,<br />please create a secure password.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="login-error" role="alert" style={{ marginBottom: 16 }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form" noValidate style={{ gap: 14 }}>

          {/* New Password */}
          <div className="login-field">
            <label htmlFor="newPassword" className="login-label">New Password</label>
            <div className="login-input-wrapper">
              <Lock className="login-input-icon" />
              <input
                ref={newPwRef}
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="login-input login-input-password"
                required
                autoComplete="new-password"
                aria-describedby="pw-requirements"
              />
              <button type="button" onClick={() => setShowNew((v) => !v)}
                className="login-password-toggle" aria-label={showNew ? 'Hide' : 'Show'}>
                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="login-field">
            <label htmlFor="confirmPassword" className="login-label">Confirm Password</label>
            <div className="login-input-wrapper">
              <Lock className="login-input-icon" />
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="login-input login-input-password"
                required
                autoComplete="new-password"
                aria-describedby="pw-requirements"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="login-password-toggle" aria-label={showConfirm ? 'Hide' : 'Show'}>
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Live requirements */}
          <div id="pw-requirements" style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '2px 0 6px' }}>
            <Requirement met={minLength} label="At least 8 characters" />
            <Requirement met={pwMatch} label="Passwords match" />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="login-submit-btn"
            id="btn-set-password"
          >
            {isLoading
              ? <div className="login-spinner" />
              : <><span>Set Password</span><ArrowRight className="w-5 h-5" /></>
            }
          </button>

        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', marginTop: 20, marginBottom: 0 }}>
          Powered by <span style={{ color: '#6366f1', fontWeight: 600 }}>Schools2AI</span> — AI-powered education
        </p>

      </div>
    </div>
  );
}

