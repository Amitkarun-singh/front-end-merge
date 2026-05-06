import { ReactNode, useState } from "react";
import { AppSidebar, MobileSidebarContext } from "./AppSidebar";
import { Menu } from "lucide-react";
import schools2aiIcon from "@/assets/schools2ai-icon.png";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <MobileSidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      <div className="h-screen flex flex-col md:flex-row w-full bg-background overflow-hidden">

        {/* ── Mobile Top Bar (hamburger) — hidden on desktop ── */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-sidebar border-b border-sidebar-border flex-shrink-0 z-40">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent text-foreground transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={schools2aiIcon} alt="Schools2AI" className="w-7 h-7" />
            <span className="font-bold text-base text-foreground">Schools2AI</span>
          </div>
        </header>

        {/* ── Sidebar — inline on desktop, overlay on mobile ── */}
        <AppSidebar />

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </MobileSidebarContext.Provider>
  );
}
