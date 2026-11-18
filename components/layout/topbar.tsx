"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Menu } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { BrandLockup } from "./brand-mark";
import { roleLabel } from "./nav-items";
import type { Profile } from "@/lib/supabase/types";

interface TopbarProps {
  profile: Profile;
  onMobileMenuToggle?: () => void;
}

export function Topbar({ profile, onMobileMenuToggle }: TopbarProps) {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/login"); // full load clears the previous user's cached layout
  }

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const firstName = profile.full_name.split(" ")[0];

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:gap-3 lg:px-8">
      {onMobileMenuToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 md:hidden"
          onClick={onMobileMenuToggle}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      )}

      <Link
        href={`/dashboard/${profile.role}/dashboard`}
        className="rounded-md md:hidden"
        aria-label="FairSplit home"
      >
        <BrandLockup showByline={false} />
      </Link>

      <div className="flex-1" />

      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-10 gap-2 rounded-full pl-1 pr-1 sm:pr-3"
            aria-label="Account menu"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
              {firstName}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60" align="end" forceMount>
          <div className="flex flex-col gap-0.5 px-2 py-2">
            <p className="text-sm font-semibold">{profile.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">{roleLabel[profile.role]}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
