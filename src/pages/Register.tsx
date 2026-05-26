import { useState, useEffect, useRef } from 'react';
import './Register.css';
import './StudentLoginPage.css';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, User, Phone, Mail, Lock, GraduationCap,
  BookOpen, ArrowRight, Check,
} from 'lucide-react';
import { useRegistration } from '@/context/RegistrationContext';
import PasswordStrength from '@/components/PasswordStrength';
import schools2aiIcon from '@/assets/schools2ai-icon.png';
import { config } from '../../app.config.js';
import { setupRecaptcha, sendOTP as firebaseSendOTP } from "@/firebase/otp";

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
const mascotBg = '/lovable-uploads/b1136e5e-34ad-4526-9763-27d3381c9bed.png';

// ─── Board data ────────────────────────────────────────────────────────────────
const BOARDS = [
  { id: 'CBSE',  label: 'CBSE',         sub: 'Central Board of Secondary Education' },
  { id: 'ICSE',  label: 'ICSE',         sub: 'Indian Certificate of Secondary Education' },
  { id: 'STATE', label: 'State Board',  sub: 'Maharashtra, UP, Tamil Nadu…' },
  { id: 'IB',    label: 'IB / Other',   sub: 'International Baccalaureate' },
] as const;

const CLASSES = ['5', '6', '7', '8', '9', '10', '11', '12'];
type BoardId = typeof BOARDS[number]['id'];

// ─── Validation helpers ────────────────────────────────────────────────────────
const validatePhone = (num: string, code: string) => {
 
  const digitsOnly = num.replace(/\D/g, '');
  if (code === '+91') {
    return /^[6-9]\d{9}$/.test(digitsOnly);
  }
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
};
const validateEmail = (e: string) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

interface FieldErrors {
  full_name?: string;
  selected_class?: string;
  phone_number?: string;
  email?: string;
  password?: string;
  confirm_password?: string;
  board?: string;
  general?: string;
}

interface Toast { type: 'error' | 'warning' | 'success'; message: string; }

export default function Register() {
  const navigate = useNavigate();
  const { role, setRegistrationData } = useRegistration();

  const [selectedRole, setSelectedRole] = useState<'STUDENT' | 'TEACHER'>(role || 'STUDENT');
  const [fullName,        setFullName]        = useState('');
  const [selectedClasses,  setSelectedClasses] = useState<string[]>([]);
  const [phoneNumber,     setPhoneNumber]     = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [selectedBoard,   setSelectedBoard]   = useState<BoardId | ''>('');
  const [countryCode,     setCountryCode]     = useState('+91');
  const [errors,          setErrors]          = useState<FieldErrors>({});
  const [submitting,      setSubmitting]      = useState(false);
  const [toast,           setToast]           = useState<Toast | null>(null);

  const errorTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const showToast = (t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 5000);
  };

  const clearFieldError = (field: keyof FieldErrors) =>
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  const setFieldError = (field: keyof FieldErrors, msg: string) => {
    setErrors(prev => ({ ...prev, [field]: msg }));
    if (errorTimers.current[field]) clearTimeout(errorTimers.current[field]);
    errorTimers.current[field] = setTimeout(() => clearFieldError(field), 6000);
  };

  useEffect(() => () => { Object.values(errorTimers.current).forEach(clearTimeout); }, []);

  const handlePhoneChange = (raw: string) => {
    setPhoneNumber(raw.replace(/\D/g, '').slice(0, 10));
    clearFieldError('phone_number');
  };

  const handleClassToggle = (cls: string) => {
    if (selectedRole === 'STUDENT') {
      setSelectedClasses([cls]);
    } else {
      setSelectedClasses(prev => 
        prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
      );
    }
    clearFieldError('selected_class');
  };

  // ─── Client-side validation ────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: FieldErrors = {};

    if (!fullName.trim()) errs.full_name = 'Full name is required';
    if (selectedClasses.length === 0) errs.selected_class = 'Please select at least one class';

    if (!phoneNumber.trim()) {
      errs.phone_number = 'Phone number is required';
    } else if (!validatePhone(phoneNumber, countryCode)) {
      errs.phone_number = countryCode === '+91'
        ? 'Enter a valid 10-digit mobile number (starting with 6–9)'
        : 'Enter a valid phone number (7 to 15 digits)';
    }

    if (email && !validateEmail(email)) {
      errs.email = 'Enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      errs.confirm_password = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errs.confirm_password = 'Passwords do not match';
    }

    if (!selectedBoard) {
      errs.board = 'Please select your board';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Submit — POST /api/auth/register then navigate to verify ─────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (selectedBoard !== 'CBSE') return; // button is disabled anyway

    setSubmitting(true);

    try {
      // Save credentials to context first
      setRegistrationData({
        role: selectedRole,
        class: selectedClasses.sort((a, b) => Number(a) - Number(b)).join(','),
        password,
        phone_number: `${countryCode}${phoneNumber.trim()}`,
        full_name: fullName.trim() || null,
        email: email.trim() || null,
        board: selectedBoard,
        boardLabel: selectedBoard,
        school_id: null,
        school_name: null,
        school_address: null,
        error: null,
        errorDetails: null,
      });

      // Step 2: Send OTP via Firebase
      const fullNumber = `${countryCode}${phoneNumber.trim()}`;
      await firebaseSendOTP(fullNumber);

      navigate('/register/verify');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error. Please check your connection.';
      showToast({ type: 'error', message });
    } finally {
      setSubmitting(false);
    }
  };

  const isCbse = selectedBoard === 'CBSE';
  const canSubmit = isCbse && !submitting;

  return (
    <div className="login-page">
      {/* <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />
      <div className="login-blob login-blob-4" /> */}

      {/* Toast */}
      {toast && (
        <div className={`reg-toast reg-toast-${toast.type}`} role="alert">{toast.message}</div>
      )}

      <div className="reg-split">
        {/* ── Left branding panel (desktop) ── */}
        <div className="reg-branding">
          <img src={mascotBg} alt="" className="reg-mascot-bg" aria-hidden="true" />
          <div className="reg-branding-content">
            <div className="reg-branding-title-row">
              <img src={schools2aiIcon} alt="Schools2AI" className="reg-branding-logo" />
              <h2>Learn smarter <span>with AI</span></h2>
            </div>
            <p className="reg-branding-tagline">Your personal CBSE study companion</p>
            <div className="reg-branding-features">
              {[
                'AI Tutor available 24/7',
                'Practice tests that adapt to you',
                'Chat with Gini, your AI study buddy',
                'Track your performance over time',
              ].map(f => (
                <div key={f} className="reg-branding-feature">
                  <div className="reg-branding-feature-dot" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="login-card-wrapper">
          <div className="login-card" style={{ overflowY: 'auto', maxHeight: '100vh' }}>

            {/* Header */}
            <div className="login-header">
              <div className="login-logo">
                <img src={schools2aiIcon} alt="Schools2AI" className="login-logo-img" />
                <h1 className="login-logo-text">Schools<span>2AI</span></h1>
              </div>
              <p className="login-subtitle">Create Account</p>
              <p className="login-description">Learn and grow — no school enrollment needed</p>
            </div>

            {/* Role Toggle */}
            <div className="reg-role-group" role="radiogroup" aria-label="Select your role">
              {(['STUDENT', 'TEACHER'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={selectedRole === r}
                  className={`reg-role-pill${selectedRole === r ? ' reg-role-pill-active' : ''}`}
                  onClick={() => setSelectedRole(r)}
                  id={`role-${r.toLowerCase()}`}
                >
                  {r === 'STUDENT' ? <GraduationCap size={15} /> : <BookOpen size={15} />}
                  I am a {r === 'STUDENT' ? 'Student' : 'Teacher'}
                </button>
              ))}
            </div>

            {/* General error */}
            {errors.general && (
              <div className="reg-error-banner" role="alert"><span>⚠ {errors.general}</span></div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="reg-form" noValidate>

              {/* Full Name */}
              <div className="reg-field">
                <label htmlFor="reg-full-name" className="reg-label">
                  Full Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div className="reg-input-wrap">
                  <User className="reg-input-icon" />
                  <input
                    id="reg-full-name"
                    type="text"
                    value={fullName}
                    onChange={e => { setFullName(e.target.value); clearFieldError('full_name'); }}
                    placeholder="Your full name"
                    className={`reg-input${errors.full_name ? ' reg-input-error' : ''}`}
                    required
                    autoComplete="name"
                  />
                </div>
                {errors.full_name && <span className="reg-field-error" role="alert">⚠ {errors.full_name}</span>}
              </div>

              {/* Class Selection */}
              <div className="reg-field">
                <label className="reg-label">
                  {selectedRole === 'TEACHER' ? 'Classes you teach' : 'Your Class'} <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div className="reg-class-grid">
                  {CLASSES.map(cls => {
                    const active = selectedClasses.includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        className={`reg-class-pill-btn${active ? ' reg-class-pill-btn-active' : ''}`}
                        onClick={() => handleClassToggle(cls)}
                      >
                        {active && <Check size={12} className="mr-1" />}
                        Class {cls}
                      </button>
                    );
                  })}
                </div>
                {errors.selected_class && <span className="reg-field-error" role="alert">⚠ {errors.selected_class}</span>}
              </div>

              {/* Phone */}
              <div className="reg-field">
                <label htmlFor="reg-phone" className="reg-label">
                  Phone Number <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div className="reg-input-wrap">
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
                      <Phone className="reg-input-icon" />
                      <input
                        id="reg-phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={e => handlePhoneChange(e.target.value)}
                        placeholder="98765 43210"
                        className={`reg-input reg-input-has-icon${errors.phone_number ? ' reg-input-error' : ''}`}
                        required
                        inputMode="numeric"
                        maxLength={10}
                        autoComplete="tel"
                      />
                      {phoneNumber.length > 0 && (
                        <span style={{
                          position: 'absolute', right: '0.875rem', top: '50%',
                          transform: 'translateY(-50%)', fontSize: '0.75rem',
                          color: phoneNumber.length === 10 ? '#10B981' : 'hsl(240 4% 55%)',
                          fontWeight: 600, pointerEvents: 'none',
                        }}>
                          {phoneNumber.length}/10
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {errors.phone_number && (
                  <span className="reg-field-error" role="alert">
                    ⚠ {errors.phone_number}{' '}
                    {errors.phone_number.includes('registered') && (
                      <Link to="/login" style={{ color: '#EF4444', fontWeight: 600 }}>Sign in instead?</Link>
                    )}
                  </span>
                )}
              </div>

              {/* Email (optional) */}
              <div className="reg-field">
                <label htmlFor="reg-email" className="reg-label">Email <span style={{ color: 'hsl(240 4% 55%)', fontWeight: 400 }}>(optional)</span></label>
                <div className="reg-input-wrap">
                  <Mail className="reg-input-icon" />
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearFieldError('email'); }}
                    placeholder="you@example.com (optional)"
                    className={`reg-input${errors.email ? ' reg-input-error' : ''}`}
                    autoComplete="email"
                  />
                </div>
                {errors.email && <span className="reg-field-error" role="alert">⚠ {errors.email}</span>}
              </div>

              {/* Password */}
              <div className="reg-field">
                <label htmlFor="reg-password" className="reg-label">
                  Password <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div className="reg-input-wrap">
                  <Lock className="reg-input-icon" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearFieldError('password'); }}
                    placeholder="Min 8 characters"
                    className={`reg-input reg-input-password${errors.password ? ' reg-input-error' : ''}`}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="reg-pw-toggle"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="reg-field-error" role="alert">⚠ {errors.password}</span>}
                <PasswordStrength password={password} />
              </div>

              {/* Confirm Password */}
              <div className="reg-field">
                <label htmlFor="reg-confirm-pw" className="reg-label">
                  Confirm Password <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div className="reg-input-wrap">
                  <Lock className="reg-input-icon" />
                  <input
                    id="reg-confirm-pw"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); clearFieldError('confirm_password'); }}
                    placeholder="Repeat your password"
                    className={`reg-input reg-input-password${errors.confirm_password ? ' reg-input-error' : ''}`}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="reg-pw-toggle"
                    onClick={() => setShowConfirm(v => !v)}
                    aria-label={showConfirm ? 'Hide' : 'Show'}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirm_password && (
                  <span className="reg-field-error" role="alert">⚠ {errors.confirm_password}</span>
                )}
              </div>

              {/* ── Board Selection ── */}
              <div className="reg-field">
                <label className="reg-label">
                  Your Board <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div className="reg-board-grid">
                  {BOARDS.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      className={`reg-board-card${selectedBoard === b.id ? ' reg-board-card-active' : ''}`}
                      onClick={() => setSelectedBoard(b.id)}
                      aria-pressed={selectedBoard === b.id}
                    >
                      {selectedBoard === b.id && (
                        <span className="reg-board-check"><Check size={11} /></span>
                      )}
                      <span className="reg-board-label">{b.label}</span>
                      <span className="reg-board-sub">{b.sub}</span>
                    </button>
                  ))}
                </div>
                {errors.board && <span className="reg-field-error" role="alert">⚠ {errors.board}</span>}
              </div>

              {/* ── Non-CBSE Warning Banner ── */}
              {selectedBoard && selectedBoard !== 'CBSE' && (
                <div className="reg-board-warning" role="alert">
                  <div className="reg-board-warning-title">
                    ⚠&nbsp; Self-registration is for CBSE users only.
                  </div>
                  <p>
                    If you're from a <strong>State Board / ICSE / IB</strong> school, ask your
                    school admin to register your school first. You'll get an invite link.
                  </p>
                  <p className="reg-board-warning-contact">
                    📧 Questions?&nbsp;
                    <a href="mailto:support@schools2ai.com">support@schools2ai.com</a>
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                id="btn-create-account"
                disabled={!canSubmit}
                className="reg-submit-btn"
                style={
                  selectedBoard && selectedBoard !== 'CBSE'
                    ? { background: '#E2E8F0', color: '#94A3B8', boxShadow: 'none', cursor: 'not-allowed' }
                    : undefined
                }
                title={
                  selectedBoard && selectedBoard !== 'CBSE'
                    ? 'Registration not available for this board'
                    : undefined
                }
              >
                {submitting ? (
                  <><div className="reg-spinner" /><span>Creating account…</span></>
                ) : selectedBoard && selectedBoard !== 'CBSE' ? (
                  <span>Registration not available for this board</span>
                ) : (
                  <><span>Create Account</span><ArrowRight size={18} /></>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="login-footer">
              Already have an account?{' '}
              <Link to="/login" className="login-forgot-link">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
