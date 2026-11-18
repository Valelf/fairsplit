"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { BottomTabBar, MobileNav } from "./mobile-nav";
import type { Profile } from "@/lib/supabase/types";

interface DashboardShellProps {
  profile: Profile;
  children: React.ReactNode;
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isTenant = profile.role === "tenant";

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to content
      </a>

      <Sidebar role={profile.role} />
      <MobileNav
        role={profile.role}
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          profile={profile}
          onMobileMenuToggle={isTenant ? undefined : () => setMobileNavOpen(true)}
        />

        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>

        {isTenant && <BottomTabBar role={profile.role} />}
      </div>
    </div>
  );
}
