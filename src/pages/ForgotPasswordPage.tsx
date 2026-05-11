import { useState, useEffect, useRef, useCallback } from 'react';
import './StudentLoginPage.css';
import { useNavigate, Link } from 'react-router-dom';
import {
  Phone, ArrowRight, ArrowLeft, Eye, EyeOff, Lock,
  CheckCircle2, Circle, KeyRound, RefreshCw,
} from 'lucide-react';
import schools2aiIcon from '@/assets/schools2ai-icon.png';
import { config } from '../../app.config.js';
import { setupRecaptcha, sendOTP as firebaseSendOTP, verifyOTP as firebaseVerifyOTP } from "@/firebase/otp";

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1',  flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
];

const API_BASE = config.server;

// ─── helpers ──────────────────────────────────────────────────────────────────
function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  return digits.slice(0, -4).replace(/./g, '•') + digits.slice(-4);
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="login-error" role="alert">
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414
             1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293
             1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10
             8.586 8.707 7.293z"
          clipRule="evenodd" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
      {met
        ? <CheckCircle2 style={{ width: 14, height: 14, color: '#22c55e', flexShrink: 0 }} />
        : <Circle       style={{ width: 14, height: 14, color: '#94a3b8', flexShrink: 0 }} />
      }
      <span style={{ color: met ? '#22c55e' : '#94a3b8', transition: 'color 0.2s' }}>{label}</span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // ── shared state ────────────────────────────────────────────────────────────
  const [step, setStep]               = useState<1 | 2 | 3>(1);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  // Step 1
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');

  // Step 2
  const [otp, setOtp]                 = useState('');
  const [resetToken, setResetToken]   = useState(''); // memory only — never stored

  // Step 3
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);

  // Resend countdown
  const [countdown, setCountdown]   = useState(0);
  const timerRef                    = useRef<ReturnType<typeof setInterval> | null>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef   = useRef<HTMLInputElement>(null);
  const newPwRef      = useRef<HTMLInputElement>(null);

  // Autofocus on step change
  useEffect(() => {
    if (step === 1) phoneInputRef.current?.focus();
    if (step === 2) otpInputRef.current?.focus();
    if (step === 3) newPwRef.current?.focus();
  }, [step]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Password validation
  const minLength = newPassword.length >= 8;
  const pwMatch   = newPassword.length > 0 && newPassword === confirmPassword;
  const canReset  = minLength && pwMatch && !loading;

  // ── Countdown timer ──────────────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    setCountdown(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }, []);

  // ── Step 1 — Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!phoneNumber.trim()) return;
    setLoading(true);
    setError('');

    try {
      // Ensure reCAPTCHA is initialised
      setupRecaptcha();
      const fullNumber = `${countryCode}${phoneNumber}`;
      await firebaseSendOTP(fullNumber);
      setStep(2);
      startCountdown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 — Verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setError('');

    try {
      // Step 1: Verify with Firebase
      const firebaseUser = await firebaseVerifyOTP(otp);
      
      // Step 2: Get ID Token
      const idToken = await firebaseUser.getIdToken();

      // Step 3: Exchange for resetToken at our backend
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/firebase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, phone_number: `${countryCode}${phoneNumber}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid OTP. Please try again.');

      const token = data.data?.resetToken ?? data.resetToken;
      setResetToken(token); // stays in memory only
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3 — Reset Password ──────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReset) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resetToken}`,
        },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setResetToken('');
          setOtp('');
          setStep(1);
          setError('Your session expired. Please start over.');
          return;
        }
        throw new Error(data.message || 'Password reset failed. Please try again.');
      }

      // Success — navigate to login with a success message
      navigate('/login', {
        replace: true,
        state: { successMessage: 'Password reset successfully. Please log in.' },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0) return;
    setOtp('');
    setError('');
    await handleSendOtp();
  };

  // ── Step progress indicator ──────────────────────────────────────────────────
  const stepLabels = ['Phone', 'OTP', 'Password'];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="login-page">
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />
      <div className="login-blob login-blob-4" />

      <div className="login-container" style={{ justifyContent: 'center', maxWidth: 480 }}>
        <div className="login-card-wrapper">
          <div className="login-card">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="login-header">
              <div className="login-logo">
                <img src={schools2aiIcon} alt="Schools2AI" className="login-logo-img" />
                <h1 className="login-logo-text">Schools<span>2AI</span></h1>
              </div>
              <p className="login-subtitle">Forgot Password</p>
              <p className="login-description">
                {step === 1 && 'Enter your registered phone number to receive a verification code.'}
                {step === 2 && <>We sent a code to <strong>{maskPhone(phoneNumber)}</strong></>}
                {step === 3 && 'Create a new secure password for your account.'}
              </p>
            </div>

            {/* ── Step indicator ───────────────────────────────────────────── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 0, marginBottom: '1.5rem',
            }}>
              {stepLabels.map((label, i) => {
                const num     = i + 1;
                const active  = num === step;
                const done    = num < step;
                const primary = 'hsl(262 83% 58%)';
                const muted   = 'hsl(240 6% 85%)';
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? primary : active ? primary : muted,
                        color: done || active ? '#fff' : 'hsl(240 4% 55%)',
                        fontSize: '0.78rem', fontWeight: 700,
                        transition: 'background 0.3s',
                        boxShadow: active ? `0 0 0 4px hsl(262 83% 58% / 0.15)` : 'none',
                      }}>
                        {done ? '✓' : num}
                      </div>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 600,
                        color: active ? primary : done ? primary : 'hsl(240 4% 60%)',
                      }}>{label}</span>
                    </div>
                    {i < 2 && (
                      <div style={{
                        width: 48, height: 2, margin: '0 4px', marginBottom: 18,
                        background: num < step ? primary : muted,
                        transition: 'background 0.3s',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Error banner ─────────────────────────────────────────────── */}
            {error && <ErrorBanner message={error} />}

            {/* ── Step 1: Phone Number ─────────────────────────────────────── */}
            {step === 1 && (
              <div className="login-form-section">
                <form onSubmit={handleSendOtp} className="login-form">
                  <div className="login-field">
                    <label htmlFor="fp-phone" className="login-label">Phone Number</label>
                    <div className="phone-input-container">
                      <div className="country-code-wrapper">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="country-code-select"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={`${c.code}-${c.name}`} value={c.code}>
                              {c.flag} {c.code}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="phone-number-wrapper">
                        <Phone className="login-input-icon" />
                        <input
                          ref={phoneInputRef}
                          id="fp-phone"
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="9876543210"
                          className="login-input login-input-has-icon"
                          required
                          autoComplete="tel"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !phoneNumber.trim()}
                    className="login-submit-btn"
                    id="btn-fp-send-otp"
                  >
                    {loading
                      ? <div className="login-spinner" />
                      : <><span>Send OTP</span><ArrowRight className="w-5 h-5" /></>
                    }
                  </button>

                  <p style={{ textAlign: 'center', marginTop: 4 }}>
                    <Link
                      to="/login"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.85rem', color: 'hsl(240 4% 46%)',
                        textDecoration: 'none',
                      }}
                    >
                      <ArrowLeft style={{ width: 14 }} />
                      Back to Login
                    </Link>
                  </p>
                </form>
              </div>
            )}

            {/* ── Step 2: Verify OTP ───────────────────────────────────────── */}
            {step === 2 && (
              <div className="login-form-section">
                <form onSubmit={handleVerifyOtp} className="login-form">

                  <div className="login-otp-sent-badge">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1
                           0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414
                           1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd" />
                    </svg>
                    <span>OTP sent to {maskPhone(phoneNumber)}</span>
                  </div>

                  <div className="login-field">
                    <label htmlFor="fp-otp" className="login-label">6-digit Verification Code</label>
                    <input
                      ref={otpInputRef}
                      id="fp-otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="login-input login-otp-input"
                      autoComplete="one-time-code"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="login-submit-btn login-submit-btn-otp"
                    id="btn-fp-verify"
                  >
                    {loading
                      ? <div className="login-spinner" />
                      : <><span>Verify OTP</span><KeyRound className="w-5 h-5" /></>
                    }
                  </button>

                  {/* Resend */}
                  <div className="login-resend">
                    <span>Didn't receive it?</span>
                    <button
                      type="button"
                      className="login-resend-btn"
                      disabled={countdown > 0 || loading}
                      onClick={handleResend}
                      style={{
                        opacity: countdown > 0 ? 0.5 : 1,
                        cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <RefreshCw style={{ width: 13, height: 13 }} />
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                    </button>
                  </div>

                  <p style={{ textAlign: 'center', marginTop: 0 }}>
                    <button
                      type="button"
                      onClick={() => { setStep(1); setError(''); setOtp(''); }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.85rem', color: 'hsl(240 4% 46%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                      }}
                    >
                      <ArrowLeft style={{ width: 14 }} /> Back
                    </button>
                  </p>
                </form>
              </div>
            )}

            {/* ── Step 3: Set New Password ──────────────────────────────────── */}
            {step === 3 && (
              <div className="login-form-section">
                <form onSubmit={handleResetPassword} className="login-form">

                  <div className="login-field">
                    <label htmlFor="fp-newpw" className="login-label">New Password</label>
                    <div className="login-input-wrapper">
                      <Lock className="login-input-icon" />
                      <input
                        ref={newPwRef}
                        id="fp-newpw"
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="login-input login-input-password"
                        required
                        autoComplete="new-password"
                        aria-describedby="fp-requirements"
                      />
                      <button type="button" onClick={() => setShowNew(v => !v)}
                        className="login-password-toggle"
                        aria-label={showNew ? 'Hide password' : 'Show password'}>
                        {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="login-field">
                    <label htmlFor="fp-confirmpw" className="login-label">Confirm Password</label>
                    <div className="login-input-wrapper">
                      <Lock className="login-input-icon" />
                      <input
                        id="fp-confirmpw"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="login-input login-input-password"
                        required
                        autoComplete="new-password"
                        aria-describedby="fp-requirements"
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)}
                        className="login-password-toggle"
                        aria-label={showConfirm ? 'Hide' : 'Show'}>
                        {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div id="fp-requirements" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <Requirement met={minLength} label="At least 8 characters" />
                    <Requirement met={pwMatch}   label="Passwords match" />
                  </div>

                  <button
                    type="submit"
                    disabled={!canReset}
                    className="login-submit-btn"
                    id="btn-fp-reset"
                  >
                    {loading
                      ? <div className="login-spinner" />
                      : <><span>Reset Password</span><ArrowRight className="w-5 h-5" /></>
                    }
                  </button>

                  <p style={{ textAlign: 'center', marginTop: 0 }}>
                    <button
                      type="button"
                      onClick={() => { setStep(2); setError(''); }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.85rem', color: 'hsl(240 4% 46%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                      }}
                    >
                      <ArrowLeft style={{ width: 14 }} /> Back
                    </button>
                  </p>
                </form>
              </div>
            )}

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <div className="login-footer">
              <p>Powered by <span className="login-footer-brand">Schools2AI</span> — AI-powered education</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
