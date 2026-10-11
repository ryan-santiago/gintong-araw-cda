import {
  CalendarDays,
  ClipboardCheck,
  History,
  KeyRound,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"

import type { PermissionKey } from "@/lib/permissions"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  /** Permission key required to see the item (enforced from Phase 1). */
  permission: PermissionKey
  description: string
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: "dashboard.view",
        description: "Membership and attendance at a glance",
      },
    ],
  },
  {
    label: "Community",
    items: [
      {
        title: "Members",
        href: "/members",
        icon: Users,
        permission: "member.view",
        description: "Household records, photos and ID cards",
      },
      {
        title: "Attendance",
        href: "/attendance",
        icon: ClipboardCheck,
        permission: "meeting.view",
        description: "Check-ins and attendance exports",
      },
      {
        title: "Meetings",
        href: "/meetings",
        icon: CalendarDays,
        permission: "meeting.view",
        description: "Schedule, open and close meetings",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Users",
        href: "/users",
        icon: ShieldCheck,
        permission: "user.view",
        description: "Accounts and registration approvals",
      },
      {
        title: "Groups & Roles",
        href: "/groups",
        icon: KeyRound,
        permission: "group.view",
        description: "Permissions and rank hierarchy",
      },
      {
        title: "Audit Trail",
        href: "/audit",
        icon: History,
        permission: "audit.view",
        description: "Every change, who made it and when",
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        permission: "settings.manage",
        description: "Organization and ID card settings",
      },
    ],
  },
]

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
