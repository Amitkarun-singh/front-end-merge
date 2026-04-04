import { ReactNode, useState } from "react";
import { AppSidebar, MobileSidebarContext } from "./AppSidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <MobileSidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      {/* h-screen + overflow-hidden locks the total height so the sidebar never scrolls vertically */}
      <div className="h-screen flex w-full bg-background overflow-hidden">
        <AppSidebar />

        {/*
          Mobile: The icon strip is `fixed` (out of flex flow).
          This spacer (w-16) holds the 64px spot in the flex layout so
          <main> only gets the remaining width — no overflow/white gap.
          Hidden on desktop because AppSidebar itself is in the flow there.
        */}
        <div className="w-16 flex-shrink-0 md:hidden" />

        {/* overflow-y-auto: only the content panel scrolls, sidebar stays fixed */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </MobileSidebarContext.Provider>
  );
}
