"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/types";
import { BrandGlyph, BrandLockup } from "./brand-mark";
import { getNavItems, isNavItemActive, roleLabel } from "./nav-items";

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = getNavItems(role);
  const home = `/dashboard/${role}/dashboard`;

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col bg-rail text-rail-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-rail-border px-4",
          collapsed && "justify-center px-0"
        )}
      >
        <Link
          href={home}
          aria-label="FairSplit home"
          className="rounded-md focus-visible:ring-offset-rail"
        >
          {collapsed ? <BrandGlyph /> : <BrandLockup tone="rail" />}
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-offset-rail",
                isActive
                  ? "bg-rail-active text-rail-active-foreground"
                  : "text-rail-foreground hover:bg-rail-active/60 hover:text-rail-active-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-2 left-0 w-0.5 rounded-full bg-rail-accent transition-opacity",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <item.icon
                aria-hidden="true"
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-rail-accent" : "text-rail-muted group-hover:text-rail-foreground"
                )}
              />
              {collapsed ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "flex items-center gap-2 border-t border-rail-border p-3",
          collapsed && "justify-center"
        )}
      >
        {!collapsed && (
          <span className="flex-1 truncate px-2 text-xs text-rail-muted">
            {roleLabel[role]} workspace
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rail-muted transition-colors hover:bg-rail-active hover:text-rail-active-foreground focus-visible:ring-offset-rail"
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </aside>
  );
}
