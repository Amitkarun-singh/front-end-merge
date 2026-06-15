import { useState, useEffect } from 'react';
import './StudentLoginPage.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { AccountInfo } from '@/context/AuthContext';
import { ArrowRight, ArrowLeft, CheckCircle2, BookOpen, Brain, Sparkles } from 'lucide-react';
import schools2aiIcon from '@/assets/schools2ai-icon.png';

/* ── Role badge colour config ──────────────────────────────────────────────── */
const ROLE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  admin: {
    bg: 'hsl(262 83% 96%)',
    color: 'hsl(262 83% 40%)',
    border: 'hsl(262 83% 80%)',
  },
  teacher: {
    bg: 'hsl(167 60% 94%)',
    color: 'hsl(167 60% 28%)',
    border: 'hsl(167 60% 72%)',
  },
  parent: {
    bg: 'hsl(38 92% 94%)',
    color: 'hsl(38 92% 32%)',
    border: 'hsl(38 92% 72%)',
  },
  default: {
    bg: 'hsl(240 5% 96%)',
    color: 'hsl(240 4% 36%)',
    border: 'hsl(240 5% 82%)',
  },
};

function getRoleStyle(role: string) {
  return ROLE_STYLES[role.toLowerCase()] ?? ROLE_STYLES.default;
}

/* ── Avatar initials helper ────────────────────────────────────────────────── */
function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/* ── Avatar gradient by user_id ─────────────────────────────────────────────── */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, hsl(262 83% 58%), hsl(240 60% 48%))',
  'linear-gradient(135deg, hsl(167 60% 40%), hsl(187 96% 42%))',
  'linear-gradient(135deg, hsl(38 92% 50%), hsl(330 80% 55%))',
  'linear-gradient(135deg, hsl(330 80% 50%), hsl(262 83% 55%))',
  'linear-gradient(135deg, hsl(220 80% 55%), hsl(262 83% 58%))',
];

function avatarGradient(userId: number) {
  return AVATAR_GRADIENTS[userId % AVATAR_GRADIENTS.length];
}

/* ══════════════════════════════════════════════════════════════════════════════
   AccountPickerPage
══════════════════════════════════════════════════════════════════════════════ */
export default function AccountPickerPage() {
  const { pendingAccounts, selectAccount, isAuthenticated, loading, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Router state is passed as a race-condition-safe fallback: if the context
  // hasn't committed the pendingAccounts update by the time this component
  // mounts, we still have the accounts list from navigation state.
  const routerAccounts = (location.state as { accounts?: AccountInfo[] } | null)?.accounts;
  const allAccounts: AccountInfo[] = pendingAccounts ?? routerAccounts ?? [];

  // Only show accounts the portal supports — filter out parent and other roles
  const PORTAL_ROLES = ['teacher', 'student'];
  const accounts = allAccounts.filter((a) =>
    PORTAL_ROLES.includes(a.role.toLowerCase().trim())
  );
  const hiddenCount = allAccounts.length - accounts.length;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* Guard: if there are no pending accounts, redirect to login */
  useEffect(() => {
    if (!pendingAccounts && !routerAccounts) return; // still loading / context settling
    if (accounts.length === 0) {
      navigate('/login', { replace: true });
    }
  }, [accounts.length, navigate, pendingAccounts, routerAccounts]);

  /* Guard: if already authenticated (selection succeeded), go home */
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  /* ── Handle card click ──────────────────────────────────────────────────── */
  const handleSelect = (id: number) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setLocalError(null);
  };

  /* ── Handle continue ────────────────────────────────────────────────────── */
  const handleContinue = async () => {
    if (selectedId === null) return;
    setLocalError(null);
    setSubmitting(true);

    try {
      const result = await selectAccount(selectedId);
      if (result?.requiresPasswordReset) {
        navigate('/reset-password', { replace: true });
      }
      // success → isAuthenticated becomes true → useEffect above redirects
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setLocalError(message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Handle back ────────────────────────────────────────────────────────── */
  const handleBack = () => {
    clearError();
    navigate('/login', { replace: true });
  };

  const isLoading = loading || submitting;

  return (
    <div className="login-page">
      {/* Floating particles (reused from login) */}
      <div className="login-particles">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`login-particle login-particle-${i + 1}`}>
            {i % 3 === 0 && <BookOpen className="w-4 h-4" />}
            {i % 3 === 1 && <Brain className="w-4 h-4" />}
            {i % 3 === 2 && <Sparkles className="w-4 h-4" />}
          </div>
        ))}
      </div>

      {/* Centred card */}
      <div
        className="login-container"
        style={{ maxWidth: 520, minHeight: 'auto', flexDirection: 'column' }}
      >
        <div className="login-card" style={{ borderRadius: '1.5rem' }}>
          {/* ── Header ── */}
          <div className="login-header" style={{ marginBottom: '1.25rem' }}>
            <div className="login-logo">
              <img src={schools2aiIcon} alt="Schools2AI" className="login-logo-img" />
              <h1 className="login-logo-text">
                Schools<span>2AI</span>
              </h1>
            </div>
            <p className="login-subtitle">Choose an Account</p>
            <p className="login-description">
              Multiple accounts are registered to this number. Select one to continue.
            </p>
          </div>

          {/* ── Error banner ── */}
          {localError && (
            <div className="login-error" role="alert" style={{ marginBottom: '1rem' }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{localError}</span>
            </div>
          )}

          {/* ── Account list ── */}
          <div className="account-list">
            {accounts.map((account) => {
              const isSelected = selectedId === account.user_id;
              const isInactive = account.status === 'inactive';
              const roleStyle = getRoleStyle(account.role);

              return (
                <button
                  key={account.user_id}
                  id={`account-card-${account.user_id}`}
                  className={[
                    'account-item',
                    isSelected ? 'account-item-selected' : '',
                    isInactive ? 'account-item-inactive' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => !isInactive && handleSelect(account.user_id)}
                  disabled={isLoading || isInactive}
                  aria-pressed={isSelected}
                  aria-disabled={isInactive}
                  type="button"
                >
                  {/* Avatar */}
                  <div
                    className="account-avatar"
                    style={{ background: avatarGradient(account.user_id) }}
                    aria-hidden="true"
                  >
                    {getInitials(account.full_name)}
                  </div>

                  {/* Info */}
                  <div className="account-info">
                    <span className="account-name">{account.full_name}</span>
                    <div className="account-meta">
                      {/* Role badge */}
                      <span
                        className="account-role-badge"
                        style={{
                          background: roleStyle.bg,
                          color: roleStyle.color,
                          borderColor: roleStyle.border,
                        }}
                      >
                        {account.role}
                      </span>

                      {/* Inactive badge */}
                      {isInactive && (
                        <span className="account-inactive-badge">Inactive</span>
                      )}
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <CheckCircle2
                      className="account-check-icon"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Continue button ── */}
          <button
            id="btn-select-account"
            type="button"
            className="login-submit-btn"
            style={{ marginTop: '1.25rem' }}
            disabled={selectedId === null || isLoading}
            onClick={handleContinue}
          >
            {isLoading ? (
              <div className="login-spinner" />
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* ── Back link ── */}
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              id="btn-back-to-login"
              type="button"
              className="account-back-link"
              onClick={handleBack}
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4" />
              Use a different number
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
