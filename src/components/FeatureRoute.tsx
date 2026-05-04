import { ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useFeatures, FeatureName } from "@/context/FeatureContext";
import { useAuth } from "@/context/AuthContext";
import { ShieldOff, ArrowLeft, BookOpenCheck } from "lucide-react";

interface FeatureRouteProps {
  /** The feature flag name that gates this route */
  feature: FeatureName;
  /** Page content to render when the feature is enabled */
  children: ReactNode;
  /**
   * When true, instead of silently redirecting, render a friendly
   * "Feature disabled by school" message with a contact-teacher prompt.
   * Use this for pages the user can intentionally navigate to (e.g. My Tests).
   */
  showDisabledMessage?: boolean;
  /** Where to redirect if disabled and showDisabledMessage is false — defaults to "/" */
  redirectTo?: string;
  /**
   * Custom title shown on the disabled message screen.
   * Defaults to a generic message.
   */
  disabledTitle?: string;
}

/** ─── Disabled Feature Screen ──────────────────────────────────────────────── */
function FeatureDisabledScreen({ title }: { title: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleName =
    typeof user?.role === "string"
      ? user.role
      : (user?.role as { role_name?: string })?.role_name || "";
  const isStudent = roleName.toLowerCase().includes("student");

  return (
    <div className="flex flex-1 items-center justify-center min-h-[80vh] px-4">
      <div className="animate-fade-in text-center max-w-md w-full">
        {/* Icon badge */}
        <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 border border-purple-200 flex items-center justify-center shadow-edtech">
          <div className="relative">
            <BookOpenCheck className="w-9 h-9 text-primary opacity-30" />
            <ShieldOff className="w-5 h-5 text-destructive absolute -bottom-1 -right-1" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground text-sm mb-1 font-medium uppercase tracking-wider">
          Feature Disabled by School
        </p>

        {/* Divider */}
        <div className="my-5 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Message */}
        <div className="bg-accent/60 border border-primary/10 rounded-xl px-5 py-4 mb-6 text-left space-y-2">
          <p className="text-sm text-foreground leading-relaxed">
            {isStudent
              ? "Your school has not enabled this feature for you yet."
              : "This feature has been disabled for your school."}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isStudent
              ? "Please contact your teacher or school administrator to get access to this feature."
              : "Please contact your school administrator to enable this feature."}
          </p>
        </div>

        {/* Info pill */}
        <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-full px-4 py-2 mb-6">
          <ShieldOff className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-primary font-medium">
            Access restricted by school policy
          </span>
        </div>

        {/* Back button */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

/** ─── FeatureRoute ─────────────────────────────────────────────────────────── */
export function FeatureRoute({
  feature,
  children,
  showDisabledMessage = false,
  redirectTo = "/",
  disabledTitle = "Feature Not Available",
}: FeatureRouteProps) {
  const { isFeatureEnabled, loading } = useFeatures();

  // While features are loading, render nothing to avoid a flash
  if (loading) return null;

  if (!isFeatureEnabled(feature)) {
    if (showDisabledMessage) {
      return <FeatureDisabledScreen title={disabledTitle} />;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
