import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  Home,
  User,
  Plus,
  MessageCircle,
  FileText,
  ClipboardList,
  FileSearch,
  BarChart3,
  Grid3X3,
  HelpCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Globe,
  GraduationCap,
  FileQuestion,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import schools2aiIcon from "@/assets/schools2ai-icon.png";
const studyTools = [
  {
    title: "AI Gini",
    url: "/ai-gini",
    icon: MessageCircle,
  },
  {
    title: "AI Notes",
    url: "/ai-notes",
    icon: FileText,
  },
  {
    title: "AI Tutor",
    url: "/ai-tutor",
    icon: GraduationCap,
  },
  {
    title: "AI Practice",
    url: "/ai-practice",
    icon: ClipboardList,
  },
  {
    title: "Doc Summariser",
    url: "/summarizer",
    icon: FileSearch,
  },
  {
    title: "Question Bank",
    url: "/question-bank",
    icon: FileQuestion,
  },
  {
    title: "More Tools",
    url: "/more-tools",
    icon: Grid3X3,
  },
];
const exploreLinks = [
  {
    title: "History",
    url: "/history",
    icon: BarChart3,
  },
  {
    title: "Support",
    url: "https://schools2ai.com/contact",
    icon: HelpCircle,
    external: true,
  },
  {
    title: "Feedback",
    url: "/feedback",
    icon: MessageSquare,
  },
];
export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.name || user?.Student_name || user?.username || 'Student';
  const initials = displayName.charAt(0).toUpperCase();

  // role can be a string OR an object { role_id, role_name, description, permissions }
  const roleName =
    typeof user?.role === 'string'
      ? user.role
      : (user?.role as { role_name?: string })?.role_name || 'Student';
  return (
    <aside
      className={cn(
        "h-screen sticky top-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 overflow-hidden",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 p-4 h-16">
        <img
          src={schools2aiIcon}
          alt="Schools2AI"
          className="w-8 h-8 flex-shrink-0"
        />
        {!collapsed && (
          <span className="font-display font-bold text-lg text-foreground">
            Schools2AI
          </span>
        )}
      </div>

      {/* Toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-2 h-6 w-6"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2">
        {/* Main links */}
        <div className="space-y-1">
          <Link
            to="/"
            className={cn("sidebar-link", isActive("/") && "active")}
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Home</span>}
          </Link>
          <Link
            to="/profile"
            className={cn("sidebar-link", isActive("/profile") && "active")}
          >
            <User className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Profile</span>}
          </Link>
        </div>

        {/* Student Dashboard section */}
        {!collapsed && (
          <div className="mt-6 mb-2">
            <span className="text-xs font-medium text-muted-foreground px-3 uppercase tracking-wider">
              STUDENT DASHBOARD
            </span>
          </div>
        )}
        <div className="space-y-1">
          <Link
            to="/performance"
            className={cn("sidebar-link", isActive("/performance") && "active")}
          >
            <BarChart3 className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Student Performance</span>}
          </Link>
        </div>

        {/* Study Tools section */}
        {!collapsed && (
          <div className="mt-6 mb-2">
            <span className="text-xs font-medium text-muted-foreground px-3 uppercase tracking-wider">
              Study Tools
            </span>
          </div>
        )}
        {collapsed && <Separator className="my-4" />}
        <div className="space-y-1">
          {studyTools.map((item) => (
            <Link
              key={item.title}
              to={item.url}
              className={cn("sidebar-link", isActive(item.url) && "active")}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          ))}
        </div>

        {/* Explore & Help section */}
        {!collapsed && (
          <div className="mt-6 mb-2">
            <span className="text-xs font-medium text-muted-foreground px-3 uppercase tracking-wider">
              Explore & Help
            </span>
          </div>
        )}
        {collapsed && <Separator className="my-4" />}
        <div className="space-y-1">
          {exploreLinks.map((item) =>
            item.external ? (
              <a
                key={item.title}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-link"
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </a>
            ) : (
              <Link
                key={item.title}
                to={item.url}
                className={cn("sidebar-link", isActive(item.url) && "active")}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            ),
          )}
        </div>
      </nav>

      {/* Bottom section */}
      {/* <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="w-4 h-4" />
          {!collapsed && <span>English</span>}
        </div>
      </div> */}

      {/* User profile & Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <Link
          to="/profile"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-medium text-sm">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {displayName}
              </p>
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
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
