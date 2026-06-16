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
import { setupRecaptcha, sendOTP as firebaseSendOTP, verifyOTP as firebaseVerifyOTP } from "@/firebase/otp";
import { registerNotificationToken, handleLoginNotifications } from "@/firebase/notification";
import { saveUserSession, clearUserSession, getUnreadNotifications } from "@/indexDB/indexDB";

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
  class?: string | number;
  section?: string;
  div?: string;
  gender?: string;
  dob?: string;
  language?: string;
  joining_date?: string;
  // Gamification / stats
  overall_score?: number;
  current_streak?: number;
  longest_streak?: number;
  last_active_date?: string;
  [key: string]: unknown;
}

/** Shape of each account returned by the multi-account login response */
export interface AccountInfo {
  user_id: number;
  full_name: string;
  role: string;
  school_id: number;
  status: string;
  avatar: string | null;
}

export interface AuthErrorDetails {
  message: string;
  type: string;
  statusCode: number;
  errors?: Array<{ field: string; message: string }>;
  [key: string]: unknown;
}

export class AuthError extends Error {
  type: string;
  statusCode: number;
  errors?: Array<{ field: string; message: string }>;
  extra?: Record<string, unknown>;

  constructor(message: string, type: string, statusCode: number, extra?: Record<string, unknown>) {
    super(message);
    this.name = "AuthError";
    this.type = type;
    this.statusCode = statusCode;

    const errs = extra?.errors || extra?.extra?.errors;
    if (Array.isArray(errs)) {
      this.errors = errs as Array<{ field: string; message: string }>;
    }
    this.extra = extra;
  }
}

/** Roles permitted to access this portal. All others are rejected at login. */
const ALLOWED_ROLES = ["teacher", "student"] as const;

function assertRoleAllowed(role: unknown): void {
  const normalized = (typeof role === "string" ? role : "").toLowerCase().trim();
  if (!ALLOWED_ROLES.includes(normalized as typeof ALLOWED_ROLES[number])) {
    throw new AuthError(
      "Access denied. Only teachers and students can log in to this portal.",
      "ROLE_NOT_ALLOWED",
      403
    );
  }
}

async function handleResponseError(res: Response, fallbackMessage: string): Promise<never> {
  const data = await res.json().catch(() => ({}));
  let message = data.message || fallbackMessage;
  const type = data.type || "UNKNOWN_ERROR";

  const retryAfterHeader = res.headers.get("Retry-After");
  const extraData = {
    ...data,
    ...(retryAfterHeader ? { retryAfter: retryAfterHeader } : {}),
  };

  const errors = data.errors || data.extra?.errors;
  if (type === "VALIDATION_ERROR" && Array.isArray(errors)) {
    message = errors
      .map((e: any) => e.message || "Invalid value")
      .join(". ");
  }

  throw new AuthError(message, type, res.status, extraData);
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  errorDetails: AuthErrorDetails | null;
  /** Non-null when the login response requires account selection */
  pendingAccounts: AccountInfo[] | null;
  /** Accounts linked to the same phone number — populated after login / on boot */
  linkedAccounts: AccountInfo[];
}

interface AuthContextType extends AuthState {
  login: (payload: Record<string, string>) => Promise<{ requiresPasswordReset?: boolean }>;
  sendOtp: (phoneNumber: string) => Promise<void>;
  verifyOtp: (payload: {
    phone_number: string;
    otp: string;
  }) => Promise<{ requiresAccountSelection?: boolean; accounts?: AccountInfo[] } | void>;
  selectAccount: (userId: number) => Promise<{ requiresPasswordReset?: boolean }>;
  /** Fetch all accounts linked to the current user's phone number */
  fetchLinkedAccounts: () => Promise<void>;
  /** Switch the active session to a different linked account */
  switchAccount: (userId: number) => Promise<{ requiresPasswordReset?: boolean }>;
  logout: () => Promise<void>;
  setAuthData: (data: { token: string; user: any }) => void;
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


  if (!hasNested) {
    // Already flat — avatarUrl at top level takes priority over avatar key
    const avatarFlat = (raw.avatarUrl as string | null) || (raw.avatar as string | null);

    return {
      ...raw,
      avatar: avatarFlat,
      overall_score: raw.overall_score as number | undefined,
      current_streak: raw.current_streak as number | undefined,
      longest_streak: raw.longest_streak as number | undefined,
      last_active_date: raw.last_active_date as string | undefined,
    } as User;
  }

  // ✅ KEY FIX: backend returns signed S3 URL in raw.avatarUrl (top-level on data object)
  //    raw.user.avatar is just the S3 key path (e.g. "avatars/1-xxx.undefined") — not usable as <img src>
  const avatarUrl = (raw.avatarUrl as string | null)   // full signed URL  ← use this
    || (userObj.avatar as string | null);   // fallback: raw key (may not render)


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
    // Gamification stats (top-level on data object)
    overall_score: raw.overall_score as number | undefined,
    current_streak: raw.current_streak as number | undefined,
    longest_streak: raw.longest_streak as number | undefined,
    last_active_date: raw.last_active_date as string | undefined,
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
    errorDetails: null,
    pendingAccounts: null,
    linkedAccounts: [],
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

  // Register notification token after login
  useEffect(() => {
    if (authState.isAuthenticated && authState.token) {
      const token = authState.token;
      registerNotificationToken(token);
    } else {
      console.log("[AuthContext] Not authenticated or no token. Skipping notification registration.");
    }
  }, [authState.isAuthenticated, authState.token, authState.user?.id, authState.user?.user_id]);




  /**
   * Fetch user profile from GET /api/v1/profile/profile
   * Flattens nested { user, school, student } into a single object.
   */
  const fetchProfile = useCallback(async () => {
    const currentToken = tokenRef.current;
    if (!currentToken) {
      console.warn("[fetchProfile] No token, skipping.");
      return;
    }

    const url = `${API_BASE}/api/v1/profile/profile`;


    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setAuthState({
            isAuthenticated: false,
            user: null,
            token: null,
            loading: false,
            error: "Session expired. Please login again.",
            errorDetails: {
              message: "Session expired. Please login again.",
              type: "SESSION_EXPIRED",
              statusCode: 401,
            },
          });
          localStorage.removeItem(AUTH_STORAGE_KEY);
          return;
        }
        await handleResponseError(res, "Failed to fetch profile");
      }

      const data = await res.json().catch(() => ({}));
      const raw: Record<string, unknown> = data.data ?? data;
      const profile = flattenProfile(raw);

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
   * Fetch all accounts linked to the current user's phone number.
   * GET /api/v1/auth/accounts
   * Non-fatal — never throws; silently skips if no token or request fails.
   * Uses tokenRef.current (stale-closure-safe) — exact same pattern as fetchProfile.
   */
  const fetchLinkedAccounts = useCallback(async () => {
    const currentToken = tokenRef.current;
    if (!currentToken) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/accounts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) return;   // session expired — handled by 401 flow elsewhere
        console.warn("[fetchLinkedAccounts] non-200 response:", res.status);
        return;
      }

      const data = await res.json().catch(() => ({}));
      const accounts: AccountInfo[] = ((data.data ?? data).accounts) ?? [];
      setAuthState((prev) => ({ ...prev, linkedAccounts: accounts }));
    } catch (err) {
      console.warn("[fetchLinkedAccounts] error:", err);   // non-fatal
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Upload avatar image — POST /api/v1/auth/update-avatar
   */
  const updateAvatar = useCallback(async (file: File) => {
    const currentToken = tokenRef.current;
    if (!currentToken) throw new Error("Not authenticated");


    const formData = new FormData();
    formData.append("file", file);


    const res = await fetch(`${API_BASE}/api/v1/profile/update-avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${currentToken}`,
        // DO NOT set Content-Type — browser sets multipart/form-data with boundary automatically
      },
      body: formData,
    });

    if (!res.ok) {
      await handleResponseError(res, "Avatar upload failed");
    }

    await fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProfile]);

  /**
   * On mount, if we have a stored token, fetch fresh profile data and linked accounts.
   */
  useEffect(() => {
    if (authState.isAuthenticated && tokenRef.current) {
      fetchProfile();
      fetchLinkedAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Password login — POST /api/v1/auth/login
   */
  const login = async (payload: Record<string, string>) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null, errorDetails: null }));

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        await handleResponseError(res, "Login failed");
      }

      const data = await res.json().catch(() => ({}));
      const responseData = data.data || data;

      // ── First-time login: password reset required ─────────────────────────
      if (responseData.requiresPasswordReset && responseData.tempToken) {
        sessionStorage.setItem('tempToken', responseData.tempToken);
        setAuthState((prev) => ({ ...prev, loading: false }));
        return { requiresPasswordReset: true };
      }

      const token = responseData.accessToken || responseData.token;

      // Extract role from login response
      const role = responseData.role;

      // ── Portal access guard ───────────────────────────────────────────────
      assertRoleAllowed(role);

      //store userID in index id


      const responseUserId = responseData.profile?.userId || responseData.profile?.user_id;
      if (responseUserId) {
        const userIdStr = responseUserId.toString();
        console.log("[AuthContext] User ID:", userIdStr);
        saveUserSession(userIdStr)
          .then(() => {
            handleLoginNotifications(userIdStr);
          })
          .catch((err) => {
            console.error("[AuthContext] Failed to save user session to IndexedDB:", err);
          });
      }

      // Set minimal user state from login response first
      setAuthState((prev) => ({
        isAuthenticated: true,
        user: {
          role,
          ...(responseData.profile ? flattenProfile(responseData.profile as Record<string, unknown>) : {}),
        },
        token,
        loading: false,
        error: null,
        errorDetails: null,
        pendingAccounts: null,
        linkedAccounts: prev.linkedAccounts ?? [],  // preserve — never wipe on login
      }));

      // Immediately fetch full profile after login
      try {
        const profileRes = await fetch(`${API_BASE}/api/v1/profile/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json().catch(() => ({}));
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

      // Populate the account switcher immediately after login
      fetchLinkedAccounts();
    } catch (err: unknown) {
      let message = "Login failed";
      let errorDetails: AuthErrorDetails | null = null;

      if (err instanceof AuthError) {
        message = err.message;
        errorDetails = {
          message: err.message,
          type: err.type,
          statusCode: err.statusCode,
          errors: err.errors,
          ...err.extra,
        };
      } else if (err instanceof Error) {
        message = err.message;
      }

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: message,
        errorDetails,
      }));
      throw err;
    }
  };

  /**
   * Send OTP via Firebase — uses otp.ts sendOTP which calls signInWithPhoneNumber
   */
  const sendOtp = async (phoneNumber: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null, errorDetails: null }));

    try {
      await firebaseSendOTP(phoneNumber);
      setAuthState((prev) => ({ ...prev, loading: false }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: message,
        errorDetails: null,
      }));
      throw err;
    }
  };

  /**
   * Verify OTP via Firebase, then exchange the Firebase idToken with the backend.
   * Backend endpoint: POST /api/v1/auth/login  { idToken }
   * Server verifies the idToken using Firebase Admin SDK and returns an app token.
   */
  const verifyOtp = async (payload: {
    phone_number: string;
    otp: string;
  }): Promise<{ requiresAccountSelection?: boolean } | void> => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null, errorDetails: null }));

    try {
      // Step 1: Verify the OTP with Firebase and get the Firebase user
      const firebaseUser = await firebaseVerifyOTP(payload.otp);

      // Step 2: Get the Firebase ID token to send to our backend
      const idToken = await firebaseUser.getIdToken();

      // Step 3: Exchange the Firebase ID token with our backend for an app token
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, phone_number: payload.phone_number }),
      });

      if (!res.ok) {
        await handleResponseError(res, "OTP verification failed");
      }

      const data = await res.json().catch(() => ({}));
      const responseData = data.data || data;

      // ── Multi-account: let the caller navigate to the account picker ─────
      if (responseData.requiresAccountSelection === true) {
        const accounts: AccountInfo[] = responseData.accounts ?? [];
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          pendingAccounts: accounts,
        }));
        // Return accounts so the caller can pass them via router state
        // as a race-condition-safe fallback for AccountPickerPage
        return { requiresAccountSelection: true, accounts };
      }

      const responseUserId = responseData.profile?.userId || responseData.profile?.user_id;
      //store userID in index id
      if (responseUserId) {
        const userIdStr = responseUserId.toString();
        console.log("[AuthContext] User ID:", userIdStr);
        saveUserSession(userIdStr)
          .then(() => {
            handleLoginNotifications(userIdStr);
          })
          .catch((err) => {
            console.error("[AuthContext] Failed to save user session to IndexedDB:", err);
          });
      }

      const token = responseData.accessToken || responseData.token;
      const role = responseData.role;

      // ── Portal access guard ───────────────────────────────────────────────
      assertRoleAllowed(role);

      console.log("unread notification", await getUnreadNotifications(responseUserId))

      setAuthState((prev) => ({
        isAuthenticated: true,
        user: { role, id: responseUserId, user_id: responseUserId },
        token,
        loading: false,
        error: null,
        errorDetails: null,
        pendingAccounts: null,
        linkedAccounts: prev.linkedAccounts ?? [],  // preserve — never wipe on login
      }));

      // Step 4: Fetch full profile after OTP login
      try {
        const profileRes = await fetch(`${API_BASE}/api/v1/profile/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json().catch(() => ({}));
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

      // Populate the account switcher immediately after OTP login
      fetchLinkedAccounts();
    } catch (err: unknown) {
      let message = "OTP verification failed";
      let errorDetails: AuthErrorDetails | null = null;

      if (err instanceof AuthError) {
        message = err.message;
        errorDetails = {
          message: err.message,
          type: err.type,
          statusCode: err.statusCode,
          errors: err.errors,
          ...err.extra,
        };
      } else if (err instanceof Error) {
        message = err.message;
      }

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: message,
        errorDetails,
      }));
      throw err;
    }
  };

  /**
   * Switch active session to a different linked account.
   * POST /api/v1/auth/switch-account
   *
   * NOTE: The previous session token is NOT explicitly closed (no /auth/logout
   * call is made for the outgoing account). This is a conscious design choice —
   * short-lived access tokens expire naturally and the user may want to switch
   * back. Add a POST /auth/logout with the old token here if session-history
   * accuracy becomes a requirement.
   *
   * tokenRef is updated via a useEffect (asynchronous), so we capture the
   * current token into a local variable immediately. The inline profile fetch
   * below also uses this local variable rather than calling fetchProfile() to
   * avoid the race where tokenRef still holds the old token.
   */
  const switchAccount = async (userId: number): Promise<{ requiresPasswordReset?: boolean }> => {
    const currentToken = tokenRef.current;   // capture before any state update
    setAuthState((prev) => ({ ...prev, loading: true, error: null, errorDetails: null }));

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/switch-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!res.ok) {
        await handleResponseError(res, "Account switch failed");
      }

      const data = await res.json().catch(() => ({}));
      const responseData = data.data ?? data;

      // ── Password reset required ───────────────────────────────────────────
      if (responseData.requiresPasswordReset && responseData.tempToken) {
        sessionStorage.setItem("tempToken", responseData.tempToken);
        setAuthState((prev) => ({ ...prev, loading: false }));
        // Return flag — AccountSwitcher calls navigate('/reset-password', { replace: true })
        return { requiresPasswordReset: true };
      }

      // ── Normal success ────────────────────────────────────────────────────
      const token = responseData.accessToken ?? responseData.token;
      const role = responseData.role;

      // ── Portal access guard ───────────────────────────────────────────────
      assertRoleAllowed(role);

      setAuthState((prev) => ({
        isAuthenticated: true,
        token,
        loading: false,
        error: null,
        errorDetails: null,
        pendingAccounts: null,
        linkedAccounts: prev.linkedAccounts,   // preserve — do NOT clear on switch
        user: {
          role,
          ...(responseData.profile
            ? flattenProfile(responseData.profile as Record<string, unknown>)
            : {}),
        },
      }));

      // Inline profile fetch using the new local `token` variable.
      // We cannot call fetchProfile() here because tokenRef.current is updated
      // via a useEffect and still holds the OLD token at this point.
      try {
        const profileRes = await fetch(`${API_BASE}/api/v1/profile/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json().catch(() => ({}));
          const raw: Record<string, unknown> = profileData.data ?? profileData;
          const profile = flattenProfile(raw);
          setAuthState((prev) => ({ ...prev, user: { ...profile, role } }));
        }
      } catch {
        console.warn("Could not fetch profile after account switch.");
      }

      return {};
    } catch (err: unknown) {
      let message = "Account switch failed";
      let errorDetails: AuthErrorDetails | null = null;

      if (err instanceof AuthError) {
        message = err.message;
        errorDetails = {
          message: err.message,
          type: err.type,
          statusCode: err.statusCode,
          errors: err.errors,
          ...err.extra,
        };
      } else if (err instanceof Error) {
        message = err.message;
      }

      setAuthState((prev) => ({ ...prev, loading: false, error: message, errorDetails }));
      throw err;   // re-throw so AccountSwitcher can display it inline
    }
  };

  /**
   * Account selection — POST /api/v1/auth/select-account
   * Called after the user picks one account from the multi-account picker.
   * On success, completes login exactly like a normal login response.
   */
  const selectAccount = async (userId: number): Promise<{ requiresPasswordReset?: boolean }> => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null, errorDetails: null }));

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/select-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!res.ok) {
        await handleResponseError(res, "Account selection failed");
      }

      const data = await res.json().catch(() => ({}));
      const responseData = data.data || data;

      // ── Password reset required ───────────────────────────────────────────
      if (responseData.requiresPasswordReset && responseData.tempToken) {
        sessionStorage.setItem('tempToken', responseData.tempToken);
        setAuthState((prev) => ({ ...prev, loading: false }));
        return { requiresPasswordReset: true };
      }

      // ── Normal success ────────────────────────────────────────────────────
      const token = responseData.accessToken || responseData.token;
      const role = responseData.role;

      // ── Portal access guard ───────────────────────────────────────────────
      assertRoleAllowed(role);

      const responseUserId = responseData.profile?.userId || responseData.profile?.user_id;
      if (responseUserId) {
        const userIdStr = responseUserId.toString();
        saveUserSession(userIdStr)
          .then(() => { handleLoginNotifications(userIdStr); })
          .catch((err) => {
            console.error("[AuthContext] Failed to save user session to IndexedDB:", err);
          });
      }

      setAuthState((prev) => ({
        isAuthenticated: true,
        user: {
          role,
          ...(responseData.profile
            ? flattenProfile(responseData.profile as Record<string, unknown>)
            : {}),
        },
        token,
        loading: false,
        error: null,
        errorDetails: null,
        pendingAccounts: null,
        linkedAccounts: prev.linkedAccounts ?? [],  // preserve — never wipe on account select
      }));

      // Fetch full profile
      try {
        const profileRes = await fetch(`${API_BASE}/api/v1/profile/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json().catch(() => ({}));
          const raw: Record<string, unknown> = profileData.data ?? profileData;
          const profile = flattenProfile(raw);
          setAuthState((prev) => ({ ...prev, user: { ...profile, role } }));
        }
      } catch {
        console.warn("Could not fetch profile after account selection.");
      }

      // Populate the account switcher immediately after account selection
      fetchLinkedAccounts();

      return {};
    } catch (err: unknown) {
      let message = "Account selection failed";
      let errorDetails: AuthErrorDetails | null = null;

      if (err instanceof AuthError) {
        message = err.message;
        errorDetails = {
          message: err.message,
          type: err.type,
          statusCode: err.statusCode,
          errors: err.errors,
          ...err.extra,
        };
      } else if (err instanceof Error) {
        message = err.message;
      }

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: message,
        errorDetails,
      }));
      throw err;
    }
  };

  /**
   * Logout — POST /api/v1/auth/logout
   */
  const logout = async () => {
    const currentToken = authState.token;

    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null,
      errorDetails: null,
      pendingAccounts: null,
      linkedAccounts: [],   // clear on logout so a subsequent user sees no stale accounts
    });
    localStorage.removeItem(AUTH_STORAGE_KEY);
    clearUserSession().catch((err) => {
      console.error("[AuthContext] Failed to clear user session on logout:", err);
    });

    if (currentToken) {
      try {
        await fetch(`${API_BASE}/api/v1/auth/logout`, {
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

  const setAuthData = useCallback((data: { token: string; user: any }) => {
    const profile = flattenProfile(data.user);
    setAuthState({
      isAuthenticated: true,
      user: profile,
      token: data.token,
      loading: false,
      error: null,
      errorDetails: null,
    });
  }, []);

  const clearError = () => {
    setAuthState((prev) => ({ ...prev, error: null, errorDetails: null }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        sendOtp,
        verifyOtp,
        selectAccount,
        fetchLinkedAccounts,
        switchAccount,
        logout,
        setAuthData,
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
