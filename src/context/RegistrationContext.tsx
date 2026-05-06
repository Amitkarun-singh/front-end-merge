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

export interface RegistrationState {
  role: RegistrationRole;
  user_id: number | null;
  phone_number: string | null;
  otpToken: string | null;
  accessToken: string | null;
  // ── Credentials (saved before school lookup) ──
  username: string | null;
  password: string | null;
  full_name: string | null;
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
}

interface RegistrationContextType extends RegistrationState {
  setRole: (role: RegistrationRole) => void;
  setRegistrationData: (data: Partial<RegistrationState>) => void;
  clearRegistration: () => void;
}

const SESSION_KEY = 'schools2ai_reg';

const defaultState: RegistrationState = {
  role: null,
  user_id: null,
  phone_number: null,
  otpToken: null,
  accessToken: null,
  username: null,
  password: null,
  full_name: null,
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

  return (
    <RegistrationContext.Provider value={{ ...state, setRole, setRegistrationData, clearRegistration }}>
      {children}
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider');
  return ctx;
}
