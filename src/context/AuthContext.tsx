import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { config } from "../../app.config.js";

interface User {
  // Core identity
  id?: string | number;
  user_id?: string | number;
  full_name?: string;
  name?: string;
  username?: string;
  email?: string;
  phone_number?: string;
  number?: string;
  status?: string;
  avatar?: string | null;
  // Role
  role?: string | Record<string, unknown>;
  // School
  school_id?: string | number;
  school_name?: string;
  board?: string;
  address?: string;
  // Student
  student_id?: string | number;
  roll_number?: string;
  class?: string;
  section?: string;
  div?: string;
  gender?: string;
  dob?: string;
  language?: string;
  joining_date?: string;
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
  verifyOtp: (payload: {
    phone_number: string;
    otp: string;
    otpToken: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateAvatar: (file: File) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "schools2ai_auth";
const API_BASE = config.server;

/**
 * Flatten the nested profile API response into a single flat User object.
 * API returns: { user: {...}, school: {...}, student: {...} }
 */
function flattenProfile(raw: Record<string, unknown>): User {
  const userObj = (raw.user as Record<string, unknown>) || {};
  const schoolObj = (raw.school as Record<string, unknown>) || {};
  const studentObj = (raw.student as Record<string, unknown>) || {};

  const hasNested = raw.user !== undefined || raw.school !== undefined || raw.student !== undefined;

  console.log("[flattenProfile] raw keys:", Object.keys(raw));
  console.log("[flattenProfile] hasNested:", hasNested);

  if (!hasNested) {
    // Already flat — avatarUrl at top level takes priority over avatar key
    const avatarFlat = (raw.avatarUrl as string | null) || (raw.avatar as string | null);
    console.log("[flattenProfile] flat path — avatarUrl:", raw.avatarUrl, "| avatar:", raw.avatar, "→ using:", avatarFlat);
    return { ...raw, avatar: avatarFlat } as User;
  }

  // ✅ KEY FIX: backend returns signed S3 URL in raw.avatarUrl (top-level on data object)
  //    raw.user.avatar is just the S3 key path (e.g. "avatars/1-xxx.undefined") — not usable as <img src>
  const avatarUrl = (raw.avatarUrl as string | null)   // full signed URL  ← use this
                 || (userObj.avatar as string | null);   // fallback: raw key (may not render)

  console.log("[flattenProfile] raw.avatarUrl:", raw.avatarUrl);
  console.log("[flattenProfile] userObj.avatar:", userObj.avatar);
  console.log("[flattenProfile] → using avatar:", avatarUrl);

  return {
    // User fields
    id: userObj.user_id as string | number,
    user_id: userObj.user_id as string | number,
    full_name: userObj.full_name as string,
    name: userObj.full_name as string,
    email: userObj.email as string,
    phone_number: userObj.phone_number as string,
    number: userObj.phone_number as string,
    username: userObj.username as string,
    status: userObj.status as string,
    avatar: avatarUrl,
    // School fields
    school_id: schoolObj.school_id as string | number,
    school_name: schoolObj.school_name as string,
    board: schoolObj.board as string,
    address: schoolObj.address as string,
    // Student fields
    student_id: studentObj.student_id as string | number,
    roll_number: studentObj.roll_number as string,
    class: studentObj.class as string,
    section: studentObj.section as string,
    div: studentObj.section as string,
    gender: studentObj.gender as string,
    dob: studentObj.dob as string,
    language: studentObj.language as string,
    joining_date: studentObj.joining_date as string,
  };
}

function getStoredAuth(): Partial<AuthState> {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Re-flatten in case old storage has nested structure
      const user = parsed.user
        ? flattenProfile(parsed.user as Record<string, unknown>)
        : null;
      return {
        isAuthenticated: true,
        user,
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

  // Keep a ref to the latest token to avoid stale closures in callbacks
  const tokenRef = useRef<string | null>(authState.token ?? null);
  useEffect(() => {
    tokenRef.current = authState.token;
  }, [authState.token]);

  // Persist auth to localStorage (store flat user object)
  useEffect(() => {
    if (authState.isAuthenticated && authState.token) {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ user: authState.user, token: authState.token }),
      );
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [authState.isAuthenticated, authState.token, authState.user]);

  /**
   * Fetch user profile from GET /api/auth/profile
   * Flattens nested { user, school, student } into a single object.
   */
  const fetchProfile = useCallback(async () => {
    const currentToken = tokenRef.current;
    if (!currentToken) {
      console.warn("[fetchProfile] No token, skipping.");
      return;
    }

    const url = `${API_BASE}/api/auth/profile`;
    console.log("[fetchProfile] GET", url);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      });

      const data = await res.json();
      console.log("[fetchProfile] status:", res.status, "| response:", data);

      if (!res.ok) {
        if (res.status === 401) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            token: null,
            loading: false,
            error: "Session expired. Please login again.",
          });
          localStorage.removeItem(AUTH_STORAGE_KEY);
          return;
        }
        throw new Error(data.message || "Failed to fetch profile");
      }

      const raw: Record<string, unknown> = data.data ?? data;
      console.log("[fetchProfile] raw data:", raw);
      const profile = flattenProfile(raw);
      console.log("[fetchProfile] flattened profile avatar:", profile.avatar);

      // Preserve existing role — profile endpoint may not return role
      setAuthState((prev) => ({
        ...prev,
        user: {
          ...profile,
          role: profile.role ?? prev.user?.role,
        },
      }));
    } catch (err: unknown) {
      console.error("[fetchProfile] error:", err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Upload avatar image — POST /api/auth/update-avatar
   */
  const updateAvatar = useCallback(async (file: File) => {
    const currentToken = tokenRef.current;
    if (!currentToken) throw new Error("Not authenticated");

    console.log("[updateAvatar] File name:", file.name, "| type:", file.type, "| size:", file.size, "bytes");
    console.log("[updateAvatar] POST", `${API_BASE}/api/auth/update-avatar`);

    const formData = new FormData();
    formData.append("file", file);

    // Log FormData entries
    for (const [key, val] of formData.entries()) {
      console.log("[updateAvatar] FormData entry:", key, "->", val instanceof File ? `File(${val.name}, ${val.type})` : val);
    }

    const res = await fetch(`${API_BASE}/api/auth/update-avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${currentToken}`,
        // DO NOT set Content-Type — browser sets multipart/form-data with boundary automatically
      },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    console.log("[updateAvatar] Response status:", res.status);
    console.log("[updateAvatar] Response body:", data);

    if (!res.ok) {
      const errMsg = (data as { message?: string }).message || `Upload failed (HTTP ${res.status})`;
      console.error("[updateAvatar] FAILED:", errMsg);
      throw new Error(errMsg);
    }

    console.log("[updateAvatar] Upload successful — refreshing profile...");
    await fetchProfile();
    console.log("[updateAvatar] Profile refresh complete.");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProfile]);

  /**
   * On mount, if we have a stored token, fetch fresh profile data.
   */
  useEffect(() => {
    if (authState.isAuthenticated && tokenRef.current) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Password login — POST /api/auth/login
   */
  const login = async (payload: Record<string, string>) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      const responseData = data.data || data;
      const token = responseData.accessToken || responseData.token;

      // Extract role from login response
      const role = responseData.role;

      // Set minimal user state from login response first
      setAuthState({
        isAuthenticated: true,
        user: {
          role,
          ...(responseData.profile ? flattenProfile(responseData.profile as Record<string, unknown>) : {}),
        },
        token,
        loading: false,
        error: null,
      });

      // Immediately fetch full profile after login
      try {
        const profileRes = await fetch(`${API_BASE}/api/auth/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const profileData = await profileRes.json();

        if (profileRes.ok) {
          const raw: Record<string, unknown> = profileData.data ?? profileData;
          const profile = flattenProfile(raw);
          // Merge role from login into profile
          setAuthState((prev) => ({
            ...prev,
            user: { ...profile, role },
          }));
        }
      } catch {
        console.warn("Could not fetch profile after login, using login response data.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to send OTP");
      }

      setAuthState((prev) => ({ ...prev, loading: false }));
      return { otpToken: data.data?.otpToken || data.otpToken };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
      throw err;
    }
  };

  /**
   * Verify OTP — POST /api/auth/login
   */
  const verifyOtp = async (payload: {
    phone_number: string;
    otp: string;
    otpToken: string;
  }) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "OTP verification failed");
      }

      const responseData = data.data || data;
      const token = responseData.accessToken || responseData.token;
      const role = responseData.role;

      setAuthState({
        isAuthenticated: true,
        user: { role },
        token,
        loading: false,
        error: null,
      });

      // Fetch full profile after OTP login
      try {
        const profileRes = await fetch(`${API_BASE}/api/auth/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const profileData = await profileRes.json();

        if (profileRes.ok) {
          const raw: Record<string, unknown> = profileData.data ?? profileData;
          const profile = flattenProfile(raw);
          setAuthState((prev) => ({
            ...prev,
            user: { ...profile, role },
          }));
        }
      } catch {
        console.warn("Could not fetch profile after OTP login.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "OTP verification failed";
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
   */
  const logout = async () => {
    const currentToken = authState.token;

    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null,
    });
    localStorage.removeItem(AUTH_STORAGE_KEY);

    if (currentToken) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
        });
      } catch {
        console.warn("Backend logout call failed, local session cleared.");
      }
    }
  };

  const clearError = () => {
    setAuthState((prev) => ({ ...prev, error: null }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        sendOtp,
        verifyOtp,
        logout,
        fetchProfile,
        updateAvatar,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
