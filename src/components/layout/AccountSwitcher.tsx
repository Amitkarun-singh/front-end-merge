import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ChevronsUpDown, Loader2, AlertCircle } from "lucide-react";
import type { AccountInfo } from "@/context/AuthContext";

interface AccountSwitcherProps {
  /**
   * Mirrors the sidebar's collapsed/expanded state.
   * desktopShowLabel = !collapsed in AppSidebar.
   * When false (collapsed sidebar) the entire switcher is hidden.
   */
  showLabel: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Avatar with brand gradient fallback — matches sidebar user card pattern */
function AvatarCell({
  account,
  size = "md",
}: {
  account: AccountInfo;
  size?: "sm" | "md";
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = getInitials(account.full_name);
  const dim = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";

  if (account.avatar && !imgFailed) {
    return (
      <img
        src={account.avatar}
        alt={account.full_name}
        className={`${dim} rounded-full object-cover flex-shrink-0 ring-2 ring-transparent`}
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white`}
      style={{
        background: "linear-gradient(135deg, hsl(187 96% 42%), hsl(262 83% 58%))",
      }}
    >
      {initials}
    </div>
  );
}

/** Pill badge showing the role name */
function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize"
      style={{
        background: "hsl(270 50% 96%)",
        color: "hsl(262 83% 45%)",
      }}
    >
      {role}
    </span>
  );
}

export function AccountSwitcher({ showLabel }: AccountSwitcherProps) {
  const { user, linkedAccounts, switchAccount } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Outside-click close — hook MUST be declared before any early returns ──
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  // ── Guards (after all hooks) ──────────────────────────────────────────────
  // Strip roles the portal doesn't support (parent, admin, etc.)
  const PORTAL_ROLES = ['teacher', 'student'];
  const visibleAccounts = linkedAccounts.filter((a) =>
    PORTAL_ROLES.includes(a.role.toLowerCase().trim())
  );

  if (visibleAccounts.length <= 1) return null;
  if (!showLabel) return null;

  // Build a set of all possible ID strings for the current user.
  // The User object shape varies by login path — some paths set user_id,
  // some set id, some set student_id. We try them all so one always matches.
  const userIdCandidates = new Set(
    [user?.user_id, user?.id, user?.student_id]
      .filter((v) => v !== undefined && v !== null && v !== "")
      .map(String)
  );

  // Debug: log what we're comparing so mismatches are visible in the console
  console.log(
    "[AccountSwitcher] user ID candidates:",
    [...userIdCandidates],
    "| visible account IDs:",
    visibleAccounts.map((a) => String(a.user_id))
  );

  const activeAccount = visibleAccounts.find((a) =>
    userIdCandidates.has(String(a.user_id))
  );

  // ── Switch handler ────────────────────────────────────────────────────────
  async function handleSwitch(userId: number) {
    setSwitchError(null);
    setPendingUserId(userId);
    try {
      const result = await switchAccount(userId);
      if (result?.requiresPasswordReset) {
        navigate("/reset-password", { replace: true });
      }
      setOpen(false);
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : "Account switch failed");
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div ref={containerRef} className="relative mb-2">
      {/* ── Trigger card ──────────────────────────────────────────────────── */}
      <button
        onClick={() => {
          setSwitchError(null);
          setOpen((prev) => !prev);
        }}
        aria-label="Switch account"
        aria-expanded={open}
        className="group w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all duration-200 hover:bg-sidebar-accent border border-transparent hover:border-sidebar-border"
      >
        {/* Mini avatar of active account */}
        {activeAccount && <AvatarCell account={activeAccount} size="sm" />}

        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-semibold text-foreground truncate leading-tight">
            {activeAccount?.full_name ?? "Switch account"}
          </p>
          <p className="text-[10px] text-muted-foreground capitalize leading-tight">
            {activeAccount?.role ?? ""}
          </p>
        </div>

        {/* Chevron with rotation animation */}
        <ChevronsUpDown
          className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-all duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="absolute bottom-full left-0 right-0 mb-1.5 z-50 overflow-hidden rounded-xl border border-sidebar-border shadow-edtech-lg animate-fade-in"
          style={{
            background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(16px)",
          }}
          role="listbox"
          aria-label="Linked accounts"
        >
          {/* Header label */}
          <div
            className="px-3 py-2 border-b border-sidebar-border"
            style={{
              background: "linear-gradient(90deg, hsl(270 50% 98%), hsl(187 60% 97%))",
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Your accounts
            </p>
          </div>

          {/* Error banner */}
          {switchError && (
            <div className="flex items-start gap-2 px-3 py-2 bg-destructive/8 text-destructive text-xs border-b border-destructive/15">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{switchError}</span>
            </div>
          )}

          {/* Account rows — active account always first */}
          <ul className="py-1.5 space-y-0.5 px-1.5">
            {[...visibleAccounts]
              .sort((a, b) => {
                const aActive = userIdCandidates.has(String(a.user_id)) ? -1 : 0;
                const bActive = userIdCandidates.has(String(b.user_id)) ? -1 : 0;
                return aActive - bActive;
              })
              .map((account) => {
                const isActive = userIdCandidates.has(String(account.user_id));
                const isPending = pendingUserId === account.user_id;
                const isDisabled = pendingUserId !== null;

                return (
                  <li key={account.user_id}>
                    <button
                      onClick={() => !isActive && !isDisabled && handleSwitch(account.user_id)}
                      disabled={isActive || isDisabled}
                      role="option"
                      aria-selected={isActive}
                      className="w-full text-left transition-all duration-150"
                      style={{ borderRadius: "10px" }}
                    >
                      <div
                        className="flex items-center gap-3 rounded-[10px] transition-all duration-150 overflow-hidden"
                        style={
                          isActive
                            ? {
                                background:
                                  "linear-gradient(135deg, hsl(262 83% 58% / 0.07), hsl(187 96% 42% / 0.06))",
                                border: "1px solid hsl(262 83% 58% / 0.2)",
                              }
                            : isDisabled
                            ? { opacity: 0.45, cursor: "not-allowed", border: "1px solid transparent" }
                            : { border: "1px solid transparent" }
                        }
                        onMouseEnter={(e) => {
                          if (!isActive && !isDisabled) {
                            (e.currentTarget as HTMLElement).style.background = "hsl(270 50% 96%)";
                            (e.currentTarget as HTMLElement).style.border = "1px solid hsl(270 20% 92%)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive && !isDisabled) {
                            (e.currentTarget as HTMLElement).style.background = "";
                            (e.currentTarget as HTMLElement).style.border = "1px solid transparent";
                          }
                        }}
                      >
                        {/* ── Left accent bar (active only) ───────────── */}
                        {isActive && (
                          <div
                            className="self-stretch w-1 flex-shrink-0 rounded-l-[10px]"
                            style={{
                              background:
                                "linear-gradient(180deg, hsl(187 96% 42%), hsl(262 83% 58%))",
                              minHeight: "100%",
                            }}
                          />
                        )}

                        {/* ── Row content ─────────────────────────────── */}
                        <div
                          className="flex items-center gap-3 flex-1 min-w-0"
                          style={{ padding: isActive ? "10px 10px 10px 6px" : "10px" }}
                        >
                          {/* Avatar with gradient ring when active */}
                          <div className="relative flex-shrink-0">
                            <div
                              style={
                                isActive
                                  ? {
                                      padding: "2px",
                                      borderRadius: "50%",
                                      background:
                                        "linear-gradient(135deg, hsl(187 96% 42%), hsl(262 83% 58%))",
                                    }
                                  : {}
                              }
                            >
                              <AvatarCell account={account} />
                            </div>
                            {/* Green pulse dot */}
                            {isActive && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                                style={{ background: "hsl(160 60% 45%)" }}
                              >
                                <span
                                  className="absolute inset-0 rounded-full animate-ping"
                                  style={{ background: "hsl(160 60% 45% / 0.5)" }}
                                />
                              </span>
                            )}
                          </div>

                          {/* Text column */}
                          <div className="flex-1 min-w-0">
                            {/* ── Active chip BEFORE the name ─────────── */}
                            {isActive && (
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
                                  style={{
                                    background:
                                      "linear-gradient(90deg, hsl(187 96% 42%), hsl(262 83% 58%))",
                                    color: "white",
                                    letterSpacing: "0.07em",
                                  }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-white opacity-90" />
                                  Active
                                </span>
                              </div>
                            )}

                            {/* Name */}
                            <p
                              className="text-sm font-semibold truncate leading-snug"
                              style={
                                isActive
                                  ? { color: "hsl(262 83% 42%)" }
                                  : { color: "hsl(240 10% 15%)" }
                              }
                            >
                              {account.full_name}
                            </p>

                            {/* Role line — mirrors sidebar "● Online · role" for active, plain role for inactive */}
                            {isActive ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ background: "hsl(160 60% 45%)" }}
                                />
                                <p
                                  className="text-xs truncate capitalize"
                                  style={{ color: "hsl(160 60% 38%)" }}
                                >
                                  Online · {account.role}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground truncate capitalize mt-0.5">
                                {account.role}
                              </p>
                            )}
                          </div>

                          {/* Spinner while switching */}
                          {isPending && (
                            <Loader2
                              className="w-4 h-4 animate-spin flex-shrink-0"
                              style={{ color: "hsl(262 83% 58%)" }}
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
          </ul>


          {/* Footer hint */}
          <div className="px-3 py-1.5 border-t border-sidebar-border">
            <p className="text-[10px] text-muted-foreground text-center">
              {visibleAccounts.length} accounts on this number
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
