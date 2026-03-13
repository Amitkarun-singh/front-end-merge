import { useState, useEffect } from 'react';
import './StudentLoginPage.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Eye,
  EyeOff,
  ArrowRight,
  Phone,
  Mail,
  Lock,
  Sparkles,
  BookOpen,
  Brain,
} from 'lucide-react';
import schools2aiIcon from '@/assets/schools2ai-icon.png';

export default function StudentLoginPage() {
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const [formData, setFormData] = useState({
    phoneNumber: '',
    emailOrUsername: '',
    password: '',
    otp: '',
  });

  const { login, sendOtp, verifyOtp, isAuthenticated, loading, error, clearError } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* Password Login */
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload: Record<string, string> = {
        password: formData.password,
        ...(formData.emailOrUsername.includes('@')
          ? { email: formData.emailOrUsername }
          : { username: formData.emailOrUsername }),
      };

      await login(payload);
      // navigate happens via useEffect
    } catch {
      // error is set in context
    }
  };

  /* Send OTP */
  const handleSendOtp = async (e: React.MouseEvent) => {
    e.preventDefault();

    try {
      const result = await sendOtp(formData.phoneNumber);
      setOtpToken(result.otpToken);
      setOtpSent(true);
    } catch {
      // error is set in context
    }
  };

  /* OTP Login */
  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpToken) return;

    try {
      await verifyOtp({
        phone_number: formData.phoneNumber,
        otp: formData.otp,
        otpToken,
      });
      // navigate happens via useEffect
    } catch {
      // error is set in context
    }
  };

  const switchMode = (mode: 'password' | 'otp') => {
    setLoginMode(mode);
    setOtpSent(false);
    clearError();
    if (mode === 'password') {
      setFormData((prev) => ({ ...prev, otp: '', phoneNumber: '' }));
    } else {
      setFormData((prev) => ({ ...prev, emailOrUsername: '', password: '' }));
    }
  };

  return (
    <div className="login-page">
      {/* Animated background blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />
      <div className="login-blob login-blob-4" />

      {/* Floating particles */}
      <div className="login-particles">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`login-particle login-particle-${i + 1}`}>
            {i % 3 === 0 && <BookOpen className="w-4 h-4" />}
            {i % 3 === 1 && <Brain className="w-4 h-4" />}
            {i % 3 === 2 && <Sparkles className="w-4 h-4" />}
          </div>
        ))}
      </div>

      <div className="login-container">
        {/* Left side - branding illustration (desktop only) */}
        <div className="login-branding">
          {/* Mascot as full background */}
          <img
            src="/lovable-uploads/b1136e5e-34ad-4526-9763-27d3381c9bed.png"
            alt="Schools2AI AI Gini Mascot"
            className="login-mascot-bg"
          />

          <div className="login-branding-content">
            <div className="login-branding-title-row">
              <img
                src={schools2aiIcon}
                alt="Schools2AI"
                className="login-branding-logo"
              />
              <h2 className="login-branding-title">
                Welcome to <span>Schools2AI</span>
              </h2>
            </div>
            <p className="login-branding-subtitle">
              Your AI-powered study companion. Learn smarter, score higher, and
              unlock your full potential.
            </p>

            {/* Feature highlights */}
            <div className="login-features">
              <div className="login-feature-item">
                <div className="login-feature-dot" />
                <span>AI Tutor available 24/7</span>
              </div>
              <div className="login-feature-item">
                <div className="login-feature-dot" />
                <span>Smart notes & summaries</span>
              </div>
              <div className="login-feature-item">
                <div className="login-feature-dot" />
                <span>Practice tests & question banks</span>
              </div>
              <div className="login-feature-item">
                <div className="login-feature-dot" />
                <span>Track your performance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - login card */}
        <div className="login-card-wrapper">
          <div className="login-card">
            {/* Header */}
            <div className="login-header">
              <div className="login-logo">
                <img src={schools2aiIcon} alt="Schools2AI" className="login-logo-img" />
                <h1 className="login-logo-text">
                  Schools<span>2AI</span>
                </h1>
              </div>
              <p className="login-subtitle">Student Login</p>
              <p className="login-description">
                Sign in to access your study tools & AI assistant
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="login-tabs">
              <button
                onClick={() => switchMode('password')}
                className={`login-tab ${loginMode === 'password' ? 'login-tab-active' : ''}`}
                id="tab-password"
              >
                <Lock className="w-4 h-4" />
                Password
                {loginMode === 'password' && <div className="login-tab-indicator" />}
              </button>
              <button
                onClick={() => switchMode('otp')}
                className={`login-tab ${loginMode === 'otp' ? 'login-tab-active login-tab-active-otp' : ''}`}
                id="tab-otp"
              >
                <Phone className="w-4 h-4" />
                OTP Login
                {loginMode === 'otp' && <div className="login-tab-indicator login-tab-indicator-otp" />}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="login-error" role="alert">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form Section */}
            <div className="login-form-section">
              {loginMode === 'password' ? (
                <form onSubmit={handlePasswordLogin} className="login-form">
                  {/* Email/Username */}
                  <div className="login-field">
                    <label htmlFor="emailOrUsername" className="login-label">
                      Username or Email
                    </label>
                    <div className="login-input-wrapper">
                      <Mail className="login-input-icon" />
                      <input
                        id="emailOrUsername"
                        type="text"
                        name="emailOrUsername"
                        value={formData.emailOrUsername}
                        onChange={handleInputChange}
                        placeholder="Enter your username or email"
                        className="login-input"
                        required
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="login-field">
                    <label htmlFor="password" className="login-label">
                      Password
                    </label>
                    <div className="login-input-wrapper">
                      <Lock className="login-input-icon" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Enter your password"
                        className="login-input login-input-password"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="login-password-toggle"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="login-options">
                    <label className="login-checkbox-label" htmlFor="rememberMe">
                      <input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="login-checkbox"
                      />
                      <span>Remember me</span>
                    </label>
                    <a href="#" className="login-forgot-link">
                      Forgot password?
                    </a>
                  </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="login-submit-btn"
                    id="btn-login"
                  >
                    {loading ? (
                      <div className="login-spinner" />
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleOtpLogin} className="login-form">
                  {/* Phone Number */}
                  <div className="login-field">
                    <label htmlFor="phoneNumber" className="login-label">
                      Mobile Number
                    </label>
                    <div className="login-input-wrapper">
                      <Phone className="login-input-icon" />
                      <input
                        id="phoneNumber"
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="+91 9876543210"
                        className="login-input"
                        required
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {/* Send OTP Button */}
                  {!otpSent && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading || !formData.phoneNumber}
                      className="login-send-otp-btn"
                      id="btn-send-otp"
                    >
                      {loading ? (
                        <>
                          <div className="login-spinner login-spinner-dark" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Phone className="w-4 h-4" />
                          <span>Send OTP</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* OTP Input */}
                  {otpSent && (
                    <>
                      <div className="login-otp-sent-badge">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>OTP sent to {formData.phoneNumber}</span>
                      </div>

                      <div className="login-field">
                        <label htmlFor="otp" className="login-label">
                          Enter OTP
                        </label>
                        <input
                          id="otp"
                          type="text"
                          name="otp"
                          value={formData.otp}
                          onChange={handleInputChange}
                          placeholder="000000"
                          maxLength={6}
                          className="login-input login-otp-input"
                          autoFocus
                        />
                      </div>

                      {/* Resend OTP */}
                      <div className="login-resend">
                        <span>Didn't receive OTP?</span>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="login-resend-btn"
                        >
                          Resend
                        </button>
                      </div>

                      {/* Verify Button */}
                      <button
                        type="submit"
                        disabled={loading || !formData.otp}
                        className="login-submit-btn login-submit-btn-otp"
                        id="btn-verify"
                      >
                        {loading ? (
                          <div className="login-spinner" />
                        ) : (
                          <>
                            <span>Verify & Sign In</span>
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </>
                  )}
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="login-footer">
              <p>
                Powered by <span className="login-footer-brand">Schools2AI</span>{' '}
                — AI-powered education
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
