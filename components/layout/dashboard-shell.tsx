"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import type { Profile } from "@/lib/supabase/types";

interface DashboardShellProps {
  profile: Profile;
  children: React.ReactNode;
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={profile.role} />
      <MobileNav
        role={profile.role}
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          profile={profile}
          onMobileMenuToggle={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
