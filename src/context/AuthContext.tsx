import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface User {
  id?: string;
  name?: string;
  email?: string;
  username?: string;
  phone_number?: string;
  role?: string;
  profile_image?: string;
  class_name?: string;
  section?: string;
  school_name?: string;
  [key: string]: unknown;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (payload: Record<string, string>) => Promise<void>;
  sendOtp: (phoneNumber: string) => Promise<{ otpToken: string }>;
  verifyOtp: (payload: { phone_number: string; otp: string; otpToken: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'schools2ai_auth';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getStoredAuth(): Partial<AuthState> {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        isAuthenticated: true,
        user: parsed.user,
        token: parsed.token,
      };
    }
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  return { isAuthenticated: false, user: null, token: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = getStoredAuth();

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: stored.isAuthenticated ?? false,
    user: stored.user ?? null,
    token: stored.token ?? null,
    loading: false,
    error: null,
  });

  // Persist auth to localStorage
  useEffect(() => {
    if (authState.isAuthenticated && authState.token) {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ user: authState.user, token: authState.token })
      );
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [authState.isAuthenticated, authState.token, authState.user]);

  /**
   * Fetch user profile from GET /api/auth/profile
   * Uses the stored token for authorization.
   */
  const fetchProfile = useCallback(async () => {
    const currentToken = authState.token;
    if (!currentToken) return;

    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        // Token might be expired – force logout
        if (res.status === 401) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            token: null,
            loading: false,
            error: 'Session expired. Please login again.',
          });
          localStorage.removeItem(AUTH_STORAGE_KEY);
          return;
        }
        throw new Error(data.message || 'Failed to fetch profile');
      }

      const profile = data.data || data;

      setAuthState((prev) => ({
        ...prev,
        user: profile,
      }));
    } catch (err: unknown) {
      console.error('Profile fetch error:', err);
    }
  }, [authState.token]);

  /**
   * On mount, if we have a stored token, fetch fresh profile data.
   */
  useEffect(() => {
    if (authState.isAuthenticated && authState.token) {
      fetchProfile();
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Password login — POST /api/auth/login
   */
  const login = async (payload: Record<string, string>) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      const responseData = data.data || data;
      const token = responseData.accessToken || responseData.token;

      setAuthState({
        isAuthenticated: true,
        user: responseData.profile || responseData.user || responseData,
        token,
        loading: false,
        error: null,
      });

      // Fetch full profile after login
      try {
        const profileRes = await fetch(`${API_BASE}/api/auth/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const profileData = await profileRes.json();

        if (profileRes.ok) {
          const profile = profileData.data || profileData;
          setAuthState((prev) => ({
            ...prev,
            user: profile,
          }));
        }
      } catch {
        // Profile fetch failed, use login response data
        console.warn('Could not fetch profile after login, using login response data.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
      throw err;
    }
  };

  /**
   * Send OTP — POST /api/auth/login/send-otp
   */
  const sendOtp = async (phoneNumber: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(`${API_BASE}/api/auth/login/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      setAuthState((prev) => ({ ...prev, loading: false }));
      return { otpToken: data.data?.otpToken || data.otpToken };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
      throw err;
    }
  };

  /**
   * Verify OTP — POST /api/auth/login  (same endpoint, with OTP payload)
   */
  const verifyOtp = async (payload: {
    phone_number: string;
    otp: string;
    otpToken: string;
  }) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      const responseData = data.data || data;
      const token = responseData.accessToken || responseData.token;

      setAuthState({
        isAuthenticated: true,
        user: responseData.profile || responseData.user || responseData,
        token,
        loading: false,
        error: null,
      });

      // Fetch full profile after OTP login
      try {
        const profileRes = await fetch(`${API_BASE}/api/auth/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const profileData = await profileRes.json();

        if (profileRes.ok) {
          const profile = profileData.data || profileData;
          setAuthState((prev) => ({
            ...prev,
            user: profile,
          }));
        }
      } catch {
        console.warn('Could not fetch profile after OTP login, using login response data.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OTP verification failed';
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
      throw err;
    }
  };

  /**
   * Logout — POST /api/auth/logout
   * Calls the backend logout endpoint to invalidate the session/token,
   * then clears local state.
   */
  const logout = async () => {
    const currentToken = authState.token;

    // Clear local state immediately for instant UI feedback
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null,
    });
    localStorage.removeItem(AUTH_STORAGE_KEY);

    // Call backend logout endpoint
    if (currentToken) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
        });
      } catch {
        // Logout API failed, but we already cleared local state
        console.warn('Backend logout call failed, local session cleared.');
      }
    }
  };

  const clearError = () => {
    setAuthState((prev) => ({ ...prev, error: null }));
  };

  return (
    <AuthContext.Provider
      value={{ ...authState, login, sendOtp, verifyOtp, logout, fetchProfile, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
