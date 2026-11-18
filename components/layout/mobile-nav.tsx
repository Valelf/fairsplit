"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { UserRole } from "@/lib/supabase/types";
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  Shield,
  Wallet,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case "admin":
      return [
        { label: "Dashboard", href: "/dashboard/admin/dashboard", icon: LayoutDashboard },
        { label: "Users", href: "/dashboard/admin/users", icon: Users },
        { label: "Properties", href: "/dashboard/admin/properties", icon: Building2 },
      ];
    case "owner":
      return [
        { label: "Dashboard", href: "/dashboard/owner/dashboard", icon: LayoutDashboard },
        { label: "Properties", href: "/dashboard/owner/properties", icon: Building2 },
        { label: "Payments", href: "/dashboard/owner/payments", icon: Wallet },
        { label: "Settings", href: "/dashboard/owner/settings", icon: Settings },
      ];
    case "tenant":
      return [
        { label: "Dashboard", href: "/dashboard/tenant/dashboard", icon: LayoutDashboard },
        { label: "My Properties", href: "/dashboard/tenant/properties", icon: Building2 },
        { label: "Settings", href: "/dashboard/tenant/settings", icon: Settings },
      ];
    default:
      return [];
  }
}

interface MobileNavProps {
  role: UserRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ role, open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const navItems = getNavItems(role);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-lg font-bold">FairSplit</SheetTitle>
        </SheetHeader>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span className="capitalize">{role}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
