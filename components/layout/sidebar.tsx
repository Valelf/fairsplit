"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/supabase/types";
import {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  Settings,
  Shield,
  Flag,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/dashboard/admin/users", icon: Users },
  { label: "Properties", href: "/dashboard/admin/properties", icon: Building2 },
  { label: "Audit Log", href: "/dashboard/admin/audit-log", icon: ClipboardList },
];

const ownerNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/owner/dashboard", icon: LayoutDashboard },
  { label: "Properties", href: "/dashboard/owner/properties", icon: Building2 },
];

const tenantNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/tenant/dashboard", icon: LayoutDashboard },
  { label: "My Properties", href: "/dashboard/tenant/properties", icon: Building2 },
  { label: "Settings", href: "/dashboard/tenant/settings", icon: Settings },
];

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case "admin":
      return adminNav;
    case "owner":
      return ownerNav;
    case "tenant":
      return tenantNav;
    default:
      return tenantNav;
  }
}

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = getNavItems(role);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className={cn("flex items-center border-b h-14 px-4", collapsed && "justify-center")}>
        {!collapsed && (
          <Link href={`/dashboard/${role}/dashboard`} className="font-bold text-lg">
            FairSplit
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", !collapsed && "ml-auto")}
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground",
            collapsed && "justify-center"
          )}
        >
          <Shield className="h-3 w-3" />
          {!collapsed && <span className="capitalize">{role}</span>}
        </div>
      </div>
    </aside>
  );
}
