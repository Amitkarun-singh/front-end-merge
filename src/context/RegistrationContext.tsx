import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type RegistrationRole = 'STUDENT' | 'TEACHER' | null;

export interface ConfirmedSchool {
  school_id: number | null;
  school_name: string;
  board: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  created?: boolean;
  is_manual?: boolean;
}

export interface RegistrationErrorDetails {
  message: string;
  type: string;
  statusCode: number;
  errors?: Array<{ field: string; message: string }>;
  [key: string]: unknown;
}

export class RegistrationError extends Error {
  type: string;
  statusCode: number;
  errors?: Array<{ field: string; message: string }>;
  extra?: Record<string, unknown>;

  constructor(message: string, type: string, statusCode: number, extra?: Record<string, unknown>) {
    super(message);
    this.name = "RegistrationError";
    this.type = type;
    this.statusCode = statusCode;
    
    const errs = extra?.errors || extra?.extra?.errors;
    if (Array.isArray(errs)) {
      this.errors = errs as Array<{ field: string; message: string }>;
    }
    this.extra = extra;
  }
}

export async function handleResponseError(res: Response, fallbackMessage: string): Promise<never> {
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

  throw new RegistrationError(message, type, res.status, extraData);
}

export interface RegistrationState {
  role: RegistrationRole;
  user_id: number | null;
  phone_number: string | null;
  otpToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  class: string | null;
  // ── Credentials (saved before school lookup) ──
  password: string | null;
  full_name: string | null;
  username: string | null;
  email: string | null;
  // ── Location (Steps 3-6) ──
  state: string | null;
  state_board: string | null;      // e.g. "MahaBoard" from the states API
  city: string | null;
  district: string | null;
  pincode: string | null;
  pincodeData: Record<string, unknown> | null; // full validate-pincode response
  // ── Board (Step 7) ──
  board: string | null;            // board id, e.g. "CBSE"
  boardLabel: string | null;       // display label, e.g. "MahaBoard"
  // ── School (Step 8) ──
  selectedSchool: Record<string, unknown> | null;
  manualSchoolName: string | null;
  confirmedSchool: ConfirmedSchool | null;
  // ── Legacy / backward-compat ──
  school_id: number | null;
  school_name: string | null;
  school_address: string | null;
  // ── Curriculum (STUDENT only) ──
  section_name: string | null;    // always required for students
  stream: string | null;          // required for Grade ≥ 11; null otherwise
  // ── Error handling ──
  error: string | null;
  errorDetails: RegistrationErrorDetails | null;
}

interface RegistrationContextType extends RegistrationState {
  setRole: (role: RegistrationRole) => void;
  setRegistrationData: (data: Partial<RegistrationState>) => void;
  clearRegistration: () => void;
  clearError: () => void;
}

const SESSION_KEY = 'schools2ai_reg';

const defaultState: RegistrationState = {
  role: null,
  user_id: null,
  phone_number: null,
  otpToken: null,
  accessToken: null,
  refreshToken: null,
  class: null,
  password: null,
  full_name: null,
  username: null,
  email: null,
  state: null,
  state_board: null,
  city: null,
  district: null,
  pincode: null,
  pincodeData: null,
  board: null,
  boardLabel: null,
  selectedSchool: null,
  manualSchoolName: null,
  confirmedSchool: null,
  school_id: null,
  school_name: null,
  school_address: null,
  section_name: null,
  stream: null,
  error: null,
  errorDetails: null,
};

function loadFromSession(): RegistrationState {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return { ...defaultState, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { ...defaultState };
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RegistrationState>(loadFromSession);

  // Sync to sessionStorage on every change
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  }, [state]);

  const setRole = (role: RegistrationRole) =>
    setState(prev => ({ ...prev, role }));

  const setRegistrationData = (data: Partial<RegistrationState>) =>
    setState(prev => ({ ...prev, ...data }));

  const clearRegistration = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setState({ ...defaultState });
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null, errorDetails: null }));
  };

  return (
    <RegistrationContext.Provider value={{ ...state, setRole, setRegistrationData, clearRegistration, clearError }}>
      {children}
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider');
  return ctx;
}
