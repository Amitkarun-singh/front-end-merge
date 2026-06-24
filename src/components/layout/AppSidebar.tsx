import { useState, useEffect, createContext, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useFeatures, FeatureName } from "@/context/FeatureContext";
import { AccountSwitcher } from "./AccountSwitcher";
import { cn } from "@/lib/utils";
import {
  Home,
  User,
  MessageCircle,
  FileText,
  ClipboardList,
  FileSearch,
  BarChart3,
  Grid3X3,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  FileQuestion,
  LogOut,
  ClipboardCheck,
  BookOpenCheck,
  Presentation,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import schools2aiIcon from "@/assets/schools2ai-icon.png";

export const MobileSidebarContext = createContext<{
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}>({
  mobileOpen: false,
  setMobileOpen: () => {},
});

export function useMobileSidebar() {
  return useContext(MobileSidebarContext);
}

/** Each study-tool entry carries an optional feature flag */
interface StudyTool {
  title: string;
  url: string;
  icon: React.ElementType;
  feature?: FeatureName;
}

const studyTools: StudyTool[] = [
  { title: "AI Gini",        url: "/ai-gini",       icon: MessageCircle, feature: "AI_GINI"       },
  { title: "AI Notes",       url: "/ai-notes",      icon: FileText,      feature: "AI_NOTES"      },
  { title: "AI PPT",         url: "/ai-ppt",        icon: Presentation,  feature: "AI_NOTES"      },
  { title: "AI Tutor",       url: "/ai-tutor",      icon: GraduationCap, feature: "AI_TUTOR"      },
  { title: "AI Practice",    url: "/ai-practice",   icon: ClipboardList, feature: "AI_PRACTICE"   },
  { title: "Doc Summariser", url: "/summarizer",    icon: FileSearch,    feature: "DOC_SUMMARISER" },
  { title: "Question Bank",  url: "/question-bank", icon: FileQuestion,  feature: "QUESTION_BANK" },
  { title: "More Tools",     url: "/more-tools",    icon: Grid3X3,       feature: "MORE_TOOLS"    },
];

// Assessment entry injected into Study Tools for teachers/admins
const aiAssessmentTool: StudyTool = {
  title: "AI Assessment",
  url: "/teacher/assessments",
  icon: ClipboardCheck,
  feature: "AI_ASSESSMENT",
};
// My Tests entry injected into Study Tools for students
const myTestsTool: StudyTool = {
  title: "My Tests",
  url: "/student/tests",
  icon: BookOpenCheck,
  feature: "AI_ASSESSMENT",
};

const exploreLinks = [
  { title: "History", url: "/history", icon: BarChart3 },
  { title: "Support and Feedback", url: "/support", icon: HelpCircle },
];

export function AppSidebar() {
  // Desktop: collapsed state (starts expanded)
  const [collapsed, setCollapsed] = useState(false);
  // Mobile overlay state from context (driven by hamburger in MainLayout)
  const { mobileOpen, setMobileOpen } = useMobileSidebar();

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isFeatureEnabled } = useFeatures();
  const currentPath = location.pathname;

  const isSupportPage = currentPath === "/support" || currentPath === "/feedback";

  // Close mobile overlay on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (isSupportPage) setCollapsed(false);
  }, [isSupportPage]);

  const isActive = (path: string) => currentPath === path;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const displayName =
    user?.full_name ||
    user?.name ||
    (user as Record<string, unknown>)?.Student_name as string ||
    user?.username ||
    "User";
  const initials = displayName.charAt(0).toUpperCase();
  const roleName =
    typeof user?.role === "string"
      ? user.role
      : (user?.role as { role_name?: string })?.role_name || "Student";

  // On desktop: showLabel = !collapsed
  const desktopShowLabel = !collapsed;

  /* ────────────────────────────────────────────────────────────────────────
     Shared sidebar inner content — receives showLabel flag.
     On mobile we always pass true (full labels visible in the overlay).
     On desktop we respect the collapsed state.
  ──────────────────────────────────────────────────────────────────────── */
  const sidebarInner = (showLabel: boolean, isMobileOverlay = false) => (
    <>
      {/* Logo + optional close button */}
      <div className="flex items-center gap-2 p-4 h-16 flex-shrink-0">
        <img src={schools2aiIcon} alt="Schools2AI" className="w-8 h-8 flex-shrink-0" />
        {showLabel && (
          <span className="font-display font-bold text-lg text-foreground whitespace-nowrap flex-1">
            Schools2AI
          </span>
        )}
        {/* Close button only inside the mobile overlay */}
        {isMobileOverlay && (
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Desktop collapse/expand toggle — hidden on mobile overlay */}
      {!isMobileOverlay && !isSupportPage && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-2 h-6 w-6"
          onClick={() => setCollapsed(!collapsed)}
        >
          {showLabel ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
        <div className="space-y-1">
          <Link to="/" className={cn("sidebar-link", isActive("/") && "active")}>
            <Home className="w-5 h-5 flex-shrink-0" />
            {showLabel && <span>Home</span>}
          </Link>
          <Link to="/profile" className={cn("sidebar-link", isActive("/profile") && "active")}>
            <User className="w-5 h-5 flex-shrink-0" />
            {showLabel && <span>Profile</span>}
          </Link>
        </div>

        {showLabel ? (
          <div className="mt-6 mb-2">
            <span className="text-xs font-medium text-muted-foreground px-3 uppercase tracking-wider">
              Student Dashboard
            </span>
          </div>
        ) : <Separator className="my-4" />}
        <div className="space-y-1">
          <Link to="/performance" className={cn("sidebar-link", isActive("/performance") && "active")}>
            <BarChart3 className="w-5 h-5 flex-shrink-0" />
            {showLabel && <span>Student Performance</span>}
          </Link>
        </div>

        {showLabel ? (
          <div className="mt-6 mb-2">
            <span className="text-xs font-medium text-muted-foreground px-3 uppercase tracking-wider">
              Study Tools
            </span>
          </div>
        ) : <Separator className="my-4" />}
        <div className="space-y-1">
          {/* AI Assessment — only for teachers/admins AND feature enabled */}
          {(roleName.toLowerCase().includes("teacher") || roleName.toLowerCase().includes("admin")) &&
            isFeatureEnabled(aiAssessmentTool.feature!) && (
            <Link
              to={aiAssessmentTool.url}
              className={cn("sidebar-link", currentPath.startsWith("/teacher/assessments") && "active")}
              title={aiAssessmentTool.title}
            >
              <aiAssessmentTool.icon className="w-5 h-5 flex-shrink-0" />
              {showLabel && <span>{aiAssessmentTool.title}</span>}
            </Link>
          )}

          {/* My Tests — only for students AND feature enabled */}
          {roleName.toLowerCase().includes("student") &&
            isFeatureEnabled(myTestsTool.feature!) && (
            <Link
              to={myTestsTool.url}
              className={cn("sidebar-link", currentPath.startsWith("/student/tests") && "active")}
              title={myTestsTool.title}
            >
              <myTestsTool.icon className="w-5 h-5 flex-shrink-0" />
              {showLabel && <span>{myTestsTool.title}</span>}
            </Link>
          )}

          {/* Study tools — only render when feature is enabled */}
          {studyTools
            .filter((item) => !item.feature || isFeatureEnabled(item.feature))
            .map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className={cn("sidebar-link", isActive(item.url) && "active")}
                title={item.title}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {showLabel && <span>{item.title}</span>}
              </Link>
            ))}
        </div>

        {showLabel ? (
          <div className="mt-6 mb-2">
            <span className="text-xs font-medium text-muted-foreground px-3 uppercase tracking-wider">
              Explore &amp; Help
            </span>
          </div>
        ) : <Separator className="my-4" />}
        <div className="space-y-1">
          {exploreLinks.map((item) => (
            <Link key={item.title} to={item.url} className={cn("sidebar-link", isActive(item.url) && "active")}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {showLabel && <span>{item.title}</span>}
            </Link>
          ))}
        </div>
      </nav>

      {/* User profile & Logout */}
      <div className="p-3 border-t border-sidebar-border flex-shrink-0 relative">
        {/* Account switcher — only visible when sidebar is expanded (showLabel=true) */}
        <AccountSwitcher showLabel={showLabel} />
        <Link to="/profile" className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
          {/* Avatar with green active dot */}
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover"
                  onError={(e) => {
                    console.warn("[Sidebar] Avatar image failed to load:", user.avatar);
                    e.currentTarget.style.display = "none";
                    const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (sibling) sibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                style={{ display: user?.avatar ? "none" : "flex" }}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary items-center justify-center text-primary-foreground font-medium text-sm"
              >
                {initials}
              </div>
            </div>
            {/* Green pulse dot — shows user is active/online */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-sidebar-background"
              style={{ background: "hsl(160 60% 45%)" }}
            >
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{ background: "hsl(160 60% 45% / 0.5)" }}
              />
            </span>
          </div>

          {showLabel && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "hsl(160 60% 45%)" }}
                />
                <p className="text-xs truncate" style={{ color: "hsl(160 60% 38%)" }}>
                  Online · {roleName}
                </p>
              </div>
            </div>
          )}
        </Link>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full mt-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
          title="Logout"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {showLabel && <span>Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── DESKTOP: inline in flex layout, collapsible ── */}
      <aside
        className={cn(
          "hidden md:flex h-screen flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 overflow-hidden relative flex-shrink-0 sticky top-0",
          collapsed ? "md:w-16" : "md:w-64"
        )}
      >
        {sidebarInner(desktopShowLabel, false)}
      </aside>

      {/* ── MOBILE: full-screen slide-in overlay, no icon strip ── */}
      <div className="md:hidden">
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setMobileOpen(false)}
        />

        {/* Full sidebar overlay */}
        <aside
          className={cn(
            "fixed top-0 left-0 z-[70] h-full w-72 max-w-[85vw] bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 overflow-hidden shadow-2xl",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarInner(true, true)}
        </aside>
      </div>
    </>
  );
}
