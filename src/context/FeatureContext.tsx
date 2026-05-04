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
import { useAuth } from "./AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SchoolFeature {
  feature_id: number;
  feature_name: string;
  description: string | null;
  is_ai: number | boolean;
  is_enabled: number | boolean;
  enabled_at?: string;
}

/** Canonical feature name strings returned by the API */
export type FeatureName =
  | "AI_ASSESSMENT"
  | "AI_GINI"
  | "AI_NOTES"
  | "AI_TUTOR"
  | "AI_PRACTICE"
  | "DOC_SUMMARISER"
  | "QUESTION_BANK"
  | "MORE_TOOLS";

interface FeatureContextType {
  features: SchoolFeature[];
  loading: boolean;
  /** Returns true if the named feature is enabled for this school/user */
  isFeatureEnabled: (name: FeatureName) => boolean;
  /** Manually re-fetch features */
  refetchFeatures: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

const API_BASE = config.server;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FeatureProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, token } = useAuth();
  const [features, setFeatures] = useState<SchoolFeature[]>([]);
  const [loading, setLoading] = useState(false);
  /**
   * `initialized` flips to true once the first fetch attempt completes
   * (success OR failure). While false AND loading → show everything (no flicker).
   * Once true, we use the actual features list to gate.
   */
  const [initialized, setInitialized] = useState(false);

  // Keep a ref so the fetch callback never goes stale
  const tokenRef = useRef<string | null>(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const fetchFeatures = useCallback(async () => {
    const currentToken = tokenRef.current;
    if (!currentToken) return;

    setLoading(true);
    try {
      /**
       * Use /api/features/my-access — works for ALL roles (student, teacher, admin).
       * It also applies school-level + class/section/role overrides so the result
       * is the final effective access for this specific user.
       */
      const res = await fetch(`${API_BASE}/api/features/my-access`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (!res.ok) {
        console.warn("[FeatureContext] Failed to fetch feature access:", res.status);
        // Mark initialized so we don't show a perpetual loading state.
        // Features stay empty → all features hidden as a safe fallback.
        setInitialized(true);
        return;
      }

      const json = await res.json();
      // API wraps in { data: [...] }
      const list: SchoolFeature[] = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
        ? json.data
        : [];

      console.log("[FeatureContext] Feature access loaded:", list);
      setFeatures(list);
    } catch (err) {
      console.error("[FeatureContext] Error fetching feature access:", err);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  // Fetch whenever the user logs in (isAuthenticated flips to true with a token)
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchFeatures();
    } else {
      // Clear on logout
      setFeatures([]);
      setInitialized(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  /**
   * isFeatureEnabled logic:
   *  - While still loading (not yet initialized) → return true (no flicker)
   *  - Once initialized:
   *    - feature not found in list → false (unknown = disabled)
   *    - feature found → check is_enabled (0 / false = disabled)
   */
  const isFeatureEnabled = useCallback(
    (name: FeatureName): boolean => {
      // Still fetching — show everything to avoid a flash of missing sidebar items
      if (!initialized || loading) return true;

      const feat = features.find((f) => f.feature_name === name);
      if (!feat) return false; // unknown feature → disabled
      return feat.is_enabled !== 0 && feat.is_enabled !== false;
    },
    [features, loading, initialized]
  );

  return (
    <FeatureContext.Provider
      value={{
        features,
        loading,
        isFeatureEnabled,
        refetchFeatures: fetchFeatures,
      }}
    >
      {children}
    </FeatureContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFeatures() {
  const ctx = useContext(FeatureContext);
  if (!ctx) {
    throw new Error("useFeatures must be used within a FeatureProvider");
  }
  return ctx;
}
