"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardCheck, LayoutDashboard, Menu, QrCode, Users } from "lucide-react"

import { useSidebar } from "@/components/ui/sidebar"
import { useCan } from "@/components/viewer-provider"
import type { PermissionKey } from "@/lib/permissions"
import { isActivePath } from "@/config/nav"
import { cn } from "@/lib/utils"

const allTabs: { title: string; href: string; icon: typeof Users; permission: PermissionKey }[] = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { title: "Members", href: "/members", icon: Users, permission: "member.view" },
  { title: "Attendance", href: "/attendance", icon: ClipboardCheck, permission: "meeting.view" },
]

export function MobileNav() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const can = useCan()
  const tabs = allTabs.filter((tab) => can(tab.permission))
  const half = Math.ceil(tabs.length / 2)

  const tabClass = (active: boolean) =>
    cn(
      "flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active ? "text-foreground" : "text-muted-foreground"
    )

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex items-end justify-around border-t bg-card/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
    >
      {tabs.slice(0, half).map((tab) => {
        const active = isActivePath(pathname, tab.href)
        return (
          <Link key={tab.href} href={tab.href} className={tabClass(active)} aria-current={active ? "page" : undefined}>
            <tab.icon className={cn("size-5", active && "text-secondary")} />
            {tab.title}
          </Link>
        )
      })}

      {can("attendance.capture") && (
        <Link
          href="/attendance/capture"
          aria-label="Scan member ID"
          className="-mt-7 grid size-15 place-items-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-[0_6px_20px_color-mix(in_srgb,var(--primary)_50%,transparent)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <QrCode className="size-6" />
        </Link>
      )}

      {tabs.slice(half).map((tab) => {
        const active = isActivePath(pathname, tab.href)
        return (
          <Link key={tab.href} href={tab.href} className={tabClass(active)} aria-current={active ? "page" : undefined}>
            <tab.icon className={cn("size-5", active && "text-secondary")} />
            {tab.title}
          </Link>
        )
      })}

      <button type="button" onClick={() => setOpenMobile(true)} className={tabClass(false)}>
        <Menu className="size-5" />
        More
      </button>
    </nav>
  )
}
