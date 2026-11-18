import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  ClipboardList,
  Wallet,
  MessageCircleQuestion,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/supabase/types";

export interface NavItem {
  label: string;
  /** Shorter label for the phone tab bar. */
  shortLabel?: string;
  href: string;
  icon: LucideIcon;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/dashboard/admin/users", icon: Users },
  { label: "Properties", href: "/dashboard/admin/properties", icon: Building2 },
  { label: "Audit log", href: "/dashboard/admin/audit-log", icon: ClipboardList },
];

const ownerNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/owner/dashboard", icon: LayoutDashboard },
  { label: "Properties", href: "/dashboard/owner/properties", icon: Building2 },
  { label: "Payments", href: "/dashboard/owner/payments", icon: Wallet },
  { label: "Questions", href: "/dashboard/owner/questions", icon: MessageCircleQuestion },
  { label: "Settings", href: "/dashboard/owner/settings", icon: Settings },
];

const tenantNav: NavItem[] = [
  { label: "Home", href: "/dashboard/tenant/dashboard", icon: LayoutDashboard },
  { label: "My properties", href: "/dashboard/tenant/properties", icon: Building2 },
  { label: "Settings", href: "/dashboard/tenant/settings", icon: Settings },
];

export function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case "admin":
      return adminNav;
    case "owner":
      return ownerNav;
    default:
      return tenantNav;
  }
}

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export const roleLabel: Record<UserRole, string> = {
  admin: "Admin",
  owner: "Landlord",
  tenant: "Tenant",
};
