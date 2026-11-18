"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { UserRole } from "@/lib/supabase/types";
import { BrandLockup } from "./brand-mark";
import { getNavItems, isNavItemActive, roleLabel } from "./nav-items";

interface MobileNavProps {
  role: UserRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Slide-in navigation drawer for small screens. */
export function MobileNav({ role, open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const navItems = getNavItems(role);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-72 flex-col border-rail-border bg-rail p-0 text-rail-foreground [&>button]:text-rail-foreground"
      >
        <SheetHeader className="h-16 justify-center border-b border-rail-border px-4 text-left">
          <SheetTitle>
            <BrandLockup tone="rail" />
          </SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
        </SheetHeader>

        <nav aria-label="Main" className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-lg px-3 text-base font-medium transition-colors focus-visible:ring-offset-rail",
                  isActive
                    ? "bg-rail-active text-rail-active-foreground"
                    : "text-rail-foreground hover:bg-rail-active/60 hover:text-rail-active-foreground"
                )}
              >
                <item.icon
                  aria-hidden="true"
                  className={cn("h-5 w-5 shrink-0", isActive ? "text-rail-accent" : "text-rail-muted")}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <p className="border-t border-rail-border px-7 py-4 text-xs text-rail-muted">
          {roleLabel[role]} workspace
        </p>
      </SheetContent>
    </Sheet>
  );
}

const gridCols: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

interface BottomTabBarProps {
  role: UserRole;
  className?: string;
}

/** Phone-first tab bar (used for tenants, whose whole job fits in three tabs). */
export function BottomTabBar({ role, className }: BottomTabBarProps) {
  const pathname = usePathname();
  const navItems = getNavItems(role);

  return (
    <nav
      aria-label="Sections"
      className={cn(
        "grid border-t bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden",
        gridCols[navItems.length] ?? "grid-cols-4",
        className
      )}
    >
      {navItems.map((item) => {
        const isActive = isNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-xs transition-colors",
              isActive ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon aria-hidden="true" className="h-5 w-5" />
            {item.shortLabel ?? item.label}
          </Link>
        );
      })}
    </nav>
  );
}
