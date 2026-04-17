import { useState, useEffect, createContext, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
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

const studyTools = [
  { title: "AI Gini",        url: "/ai-gini",      icon: MessageCircle },
  { title: "AI Notes",       url: "/ai-notes",     icon: FileText      },
  { title: "AI Tutor",       url: "/ai-tutor",     icon: GraduationCap },
  { title: "AI Practice",    url: "/ai-practice",  icon: ClipboardList },
  { title: "Doc Summariser", url: "/summarizer",   icon: FileSearch    },
  { title: "Question Bank",  url: "/question-bank",icon: FileQuestion  },
  { title: "More Tools",     url: "/more-tools",   icon: Grid3X3       },
];

// Assessment entry injected into Study Tools for teachers/admins
const aiAssessmentTool = { title: "AI Assessment", url: "/teacher/assessments", icon: ClipboardCheck };
// My Tests entry injected into Study Tools for students
const myTestsTool      = { title: "My Tests",       url: "/student/tests",       icon: BookOpenCheck  };

const exploreLinks = [
  { title: "History", url: "/history", icon: BarChart3 },
  { title: "Support and Feedback", url: "/support", icon: HelpCircle },
];

export function AppSidebar() {
  // Desktop: collapsed state (starts expanded)
  const [collapsed, setCollapsed] = useState(false);
  // Mobile: overlay open state (starts closed — only icon strip shows)
  const { mobileOpen, setMobileOpen } = useMobileSidebar();

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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
  // On mobile: always render sidebar with showLabel = mobileOpen (icon strip when closed, full when open)
  const desktopShowLabel = !collapsed;

  const sidebarInner = (showLabel: boolean) => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 p-4 h-16">
        <img src={schools2aiIcon} alt="Schools2AI" className="w-8 h-8 flex-shrink-0" />
        {showLabel && (
          <span className="font-display font-bold text-lg text-foreground whitespace-nowrap">
            Schools2AI
          </span>
        )}
      </div>

      {/* Toggle button */}
      {!isSupportPage && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-2 h-6 w-6"
          onClick={() => {
            // On mobile: toggle overlay open/closed
            // On desktop: toggle collapsed
            const isMobile = window.innerWidth < 768;
            if (isMobile) setMobileOpen(!mobileOpen);
            else setCollapsed(!collapsed);
          }}
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
          {/* Inject AI Assessment for teachers/admins at the top of study tools */}
          {(roleName.toLowerCase().includes("teacher") || roleName.toLowerCase().includes("admin")) && (
            <Link
              to={aiAssessmentTool.url}
              className={cn("sidebar-link", currentPath.startsWith("/teacher/assessments") && "active")}
              title={aiAssessmentTool.title}
            >
              <aiAssessmentTool.icon className="w-5 h-5 flex-shrink-0" />
              {showLabel && <span>{aiAssessmentTool.title}</span>}
            </Link>
          )}
          {/* Inject My Tests for students */}
          {roleName.toLowerCase().includes("student") && (
            <Link
              to={myTestsTool.url}
              className={cn("sidebar-link", currentPath.startsWith("/student/tests") && "active")}
              title={myTestsTool.title}
            >
              <myTestsTool.icon className="w-5 h-5 flex-shrink-0" />
              {showLabel && <span>{myTestsTool.title}</span>}
            </Link>
          )}
          {studyTools.map((item) => (
            <Link key={item.title} to={item.url} className={cn("sidebar-link", isActive(item.url) && "active")}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {showLabel && <span>{item.title}</span>}
            </Link>
          ))}
        </div>

        {showLabel ? (
          <div className="mt-6 mb-2">
            <span className="text-xs font-medium text-muted-foreground px-3 uppercase tracking-wider">
              Explore & Help
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
      <div className="p-3 border-t border-sidebar-border">
        <Link to="/profile" className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
          <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  console.warn("[Sidebar] Avatar image failed to load:", user.avatar);
                  // Swap to the initials div on broken URL
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
          {showLabel && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground">{roleName}</p>
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
      {/* ── DESKTOP: sticky in normal flex flow, collapses/expands pushing content ── */}
      <aside
        className={cn(
          "hidden md:flex h-screen flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 overflow-hidden relative flex-shrink-0 sticky top-0",
          collapsed ? "md:w-16" : "md:w-64"
        )}
      >
        {sidebarInner(desktopShowLabel)}
      </aside>

      {/* ── MOBILE: all fixed, zero-width in flex layout ── */}
      <div className="md:hidden w-0 h-0 overflow-visible">
        {/* Always-visible icon strip (w-16, fixed left) */}
        <aside className="fixed top-0 left-0 z-50 h-screen w-16 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 overflow-hidden">
          {sidebarInner(false)}
        </aside>

        {/* Backdrop — only when mobile overlay is open */}
        <div
          className={cn(
            "fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setMobileOpen(false)}
        />

        {/* Full expanded overlay sidebar */}
        <aside
          className={cn(
            "fixed top-0 left-0 z-[70] h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 overflow-hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarInner(true)}
        </aside>
      </div>
    </>
  );
}
