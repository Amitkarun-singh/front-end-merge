import { useState, useEffect, useRef, useCallback } from 'react';
import './Register.css';
import './StudentLoginPage.css';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { useRegistration } from '@/context/RegistrationContext';
import OtpInput from '@/components/OtpInput';
import schools2aiIcon from '@/assets/schools2ai-icon.png';
import { config } from '../../app.config.js';
import { verifyOTP as firebaseVerifyOTP, sendOTP as firebaseSendOTP } from "@/firebase/otp";

const API_BASE = config.server;
const OTP_RESEND_SECONDS = 45;

interface Toast {
  type: 'error' | 'warning' | 'success';
  message: string;
}

export default function VerifyOtp() {
  const navigate = useNavigate();
  const {
    phone_number, role, user_id, setRegistrationData,
  } = useRegistration();

  // Guard: redirect if no phone (registration not done yet)
  useEffect(() => {
    if (!phone_number) navigate('/register', { replace: true });
  }, [phone_number, navigate]);

  const [otp, setOtp]                     = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading]             = useState(false);
  const [shake, setShake]                 = useState(false);
  const [error, setError]                 = useState('');
  const [toast, setToast]                 = useState<Toast | null>(null);
  const [countdown, setCountdown]         = useState(OTP_RESEND_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 5000);
  };

  const startCountdown = useCallback(() => {
    setCountdown(OTP_RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }, []);

  // Start countdown on mount
  useEffect(() => {
    startCountdown();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startCountdown]);

  const otpString = otp.join('');
  const allFilled = otpString.length === 6 && !otp.includes('');

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allFilled || loading) return;
    setLoading(true);
    setError('');

    try {
      // Step 1: Verify with Firebase
      const firebaseUser = await firebaseVerifyOTP(otpString);
      
      // Step 2: Get ID Token
      const idToken = await firebaseUser.getIdToken();

      // Step 3: Exchange for app token at our backend
      const res = await fetch(`${API_BASE}/api/auth/register/firebase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, phone_number, user_id }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg: string = data.message || 'Invalid or expired OTP';
        setError(msg);
        triggerShake();
        setOtp(Array(6).fill(''));
        return;
      }

      const d = data.data ?? data;
      setRegistrationData({
        accessToken: d.accessToken ?? d.token ?? null,
        role: d.role ?? role,
        user_id: d.user_id ?? user_id,
      });

      navigate('/register/profile', { replace: true });
    } catch {
      showToast({ type: 'error', message: 'Connection error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (silent = false) => {
    if (countdown > 0 && !silent) return;

    try {
      await firebaseSendOTP(phone_number!);
      setOtp(Array(6).fill(''));
      setError('');
      startCountdown();
      if (!silent) showToast({ type: 'success', message: 'OTP resent successfully!' });
    } catch {
      showToast({ type: 'error', message: 'Failed to resend OTP. Please try again.' });
    }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="login-page">
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />

      {/* Toast */}
      {toast && (
        <div className={`reg-toast reg-toast-${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}

      <div className="reg-centered" style={{ maxWidth: 420 }}>
        <div className="login-card" style={{ borderRadius: '1.5rem' }}>
          <>
            {/* Back */}
            <button
              type="button"
              className="reg-back-btn"
              onClick={() => navigate('/register')}
              style={{ marginBottom: '1.25rem' }}
            >
              <ArrowLeft size={16} /> Back
            </button>
            {/* Phone icon hero */}
            <div className="reg-icon-hero">
              <Phone size={32} />
            </div>

            {/* Header */}
            <div className="login-header">
              <div className="login-logo">
                <img src={schools2aiIcon} alt="Schools2AI" className="login-logo-img" />
                <h1 className="login-logo-text">Schools<span>2AI</span></h1>
              </div>
              <p className="login-subtitle">Verify your number</p>
              <p className="login-description">
                We sent a 6-digit code to{' '}
                <strong>{phone_number || '+91 ••••••••••'}</strong>
              </p>
            </div>

            {error && (
              <div className="reg-error-banner" role="alert">⚠ {error}</div>
            )}

            {/* OTP Form */}
            <form onSubmit={handleVerify} className="reg-form">
              <OtpInput
                value={otp}
                onChange={setOtp}
                shake={shake}
                disabled={loading}
              />

              <button
                type="submit"
                disabled={!allFilled || loading}
                className="reg-submit-btn"
                id="btn-verify-otp"
                aria-disabled={!allFilled || loading}
              >
                {loading
                  ? <><div className="reg-spinner" /><span>Verifying…</span></>
                  : <><span>Verify</span><ArrowRight size={18} /></>
                }
              </button>
            </form>

            {/* Resend */}
            <div className="reg-resend" style={{ marginTop: '1rem' }}>
              <span>Didn't receive it?</span>
              {countdown > 0 ? (
                <span style={{ color: 'hsl(240 4% 50%)', marginLeft: '0.25rem' }}>
                  <RefreshCw size={12} style={{ display: 'inline', marginRight: 3 }} />
                  Resend in {fmtTime(countdown)}
                </span>
              ) : (
                <button
                  type="button"
                  className="reg-resend-btn"
                  onClick={() => handleResend(false)}
                  disabled={loading}
                >
                  Resend OTP
                </button>
              )}
            </div>
          </>
        </div>
      </div>
    </div>
  );
}
