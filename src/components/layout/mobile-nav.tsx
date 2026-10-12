"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, ClipboardCheck, LayoutDashboard, Menu, QrCode, Users, Wallet } from "lucide-react"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useSidebar } from "@/components/ui/sidebar"
import { useCan } from "@/components/viewer-provider"
import type { PermissionKey } from "@/lib/permissions"
import { isActivePath } from "@/config/nav"
import { cn } from "@/lib/utils"

// In priority order; the bar shows the first three the viewer may open (everything else is under More).
const allTabs: { title: string; href: string; icon: typeof Users; permission: PermissionKey }[] = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { title: "Members", href: "/members", icon: Users, permission: "member.view" },
  { title: "Dues", href: "/contributions", icon: Wallet, permission: "contribution.view" },
  { title: "Attendance", href: "/attendance", icon: ClipboardCheck, permission: "meeting.view" },
]

const scanTargets: {
  title: string
  description: string
  href: string
  icon: typeof Users
  permission: PermissionKey
}[] = [
  {
    title: "Attendance",
    description: "Check members in at an open meeting",
    href: "/attendance/capture",
    icon: ClipboardCheck,
    permission: "attendance.capture",
  },
  {
    title: "Monthly dues",
    description: "Record a contribution payment",
    href: "/contributions/collect",
    icon: Wallet,
    permission: "contribution.collect",
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const can = useCan()
  const [chooser, setChooser] = useState(false)
  const tabs = allTabs.filter((tab) => can(tab.permission)).slice(0, 3)
  const targets = scanTargets.filter((t) => can(t.permission))
  const scanActive = targets.some((t) => isActivePath(pathname, t.href))

  const tabClass = (active: boolean) =>
    cn(
      "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active ? "text-foreground" : "text-muted-foreground"
    )

  const tab = (t: (typeof allTabs)[number]) => {
    const active = isActivePath(pathname, t.href) && !scanActive
    return (
      <Link key={t.href} href={t.href} className={tabClass(active)} aria-current={active ? "page" : undefined}>
        <t.icon className={cn("size-5", active && "text-secondary")} />
        {t.title}
      </Link>
    )
  }

  const scanClass =
    "-mt-7 grid size-15 place-items-center justify-self-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-[0_6px_20px_color-mix(in_srgb,var(--primary)_50%,transparent)] outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <nav
      aria-label="Mobile navigation"
      // Five equal columns keep the scan button in the exact centre, whatever tabs the viewer has.
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-end border-t bg-card/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
    >
      {tabs[0] ? tab(tabs[0]) : <span />}
      {tabs[1] ? tab(tabs[1]) : <span />}

      {targets.length === 1 ? (
        <Link href={targets[0]!.href} aria-label={`Scan member ID: ${targets[0]!.title}`} className={scanClass}>
          <QrCode className="size-6" />
        </Link>
      ) : targets.length > 1 ? (
        <button type="button" onClick={() => setChooser(true)} aria-label="Scan member ID" className={scanClass}>
          <QrCode className="size-6" />
        </button>
      ) : (
        <span />
      )}

      {tabs[2] ? tab(tabs[2]) : <span />}
      <button type="button" onClick={() => setOpenMobile(true)} className={tabClass(false)}>
        <Menu className="size-5" />
        More
      </button>

      <Sheet open={chooser} onOpenChange={setChooser}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="pb-0">
            <SheetTitle>Scan a member ID for…</SheetTitle>
            <SheetDescription>Choose what the scan is for.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 px-4">
            {targets.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                onClick={() => setChooser(false)}
                className="flex items-center gap-4 rounded-2xl border bg-card p-4 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <t.icon className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold">{t.title}</span>
                  <span className="block text-sm text-muted-foreground">{t.description}</span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
