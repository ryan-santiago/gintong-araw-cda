"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  Bell,
  CalendarDays,
  Loader2,
  QrCode,
  ShieldAlert,
  TrendingUp,
  TriangleAlert,
  UserCheck,
  Wallet,
} from "lucide-react"
import { useAction } from "next-safe-action/hooks"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getNotifications, type Notice } from "@/features/notifications/actions"
import { cn } from "@/lib/utils"

const SEEN_KEY = "ga.notifications.seen"
const REFRESH_MS = 2 * 60_000

const ICONS = {
  user: UserCheck,
  shield: ShieldAlert,
  qr: QrCode,
  calendar: CalendarDays,
  alert: TriangleAlert,
  wallet: Wallet,
  trend: TrendingUp,
} as const

const TONES = {
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  info: "bg-accent text-accent-foreground",
} as const

const key = (n: Notice) => `${n.id}:${n.version}`

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[])
  } catch {
    return new Set()
  }
}

export function NotificationsButton() {
  const [notices, setNotices] = useState<Notice[] | null>(null)
  // Nothing renders from `seen` until notices load on the client, so reading storage here is hydration-safe.
  const [seen, setSeen] = useState<Set<string>>(readSeen)
  const load = useAction(getNotifications, { onSuccess: ({ data }) => data && setNotices(data) })
  const refresh = useCallback(() => load.execute(), [load])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    const onFocus = () => refresh()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(t)
      window.removeEventListener("focus", onFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start polling once
  }, [])

  const unseen = (notices ?? []).filter((n) => !seen.has(key(n))).length

  function markSeen() {
    if (!notices?.length) return
    // Keep only current keys, so resolved alerts don't pile up.
    const next = new Set(notices.map(key))
    setSeen(next)
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...next]))
    } catch {
      // Seen state is a convenience only.
    }
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) refresh()
        else markSeen()
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-lg"
          className="relative rounded-xl border-0 shadow-card"
          aria-label={unseen ? `Notifications: ${unseen} new` : "Notifications"}
        >
          <Bell />
          {unseen > 0 && (
            <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground ring-2 ring-background">
              {unseen > 9 ? "9+" : unseen}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {load.isPending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notices === null ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : notices.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          <div className="max-h-[60svh] overflow-y-auto">
            {notices.map((n) => {
              const Icon = ICONS[n.icon]
              const isNew = !seen.has(key(n))
              return (
                <DropdownMenuItem key={n.id} asChild>
                  <Link href={n.href} className="items-start gap-3 py-2.5">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", TONES[n.tone])}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 font-semibold">
                        {n.title}
                        {isNew && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="new" />}
                      </span>
                      <span className="block text-xs text-muted-foreground">{n.detail}</span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
