"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  History,
  KeyRound,
  Loader2,
  Monitor,
  Moon,
  QrCode,
  Search,
  Sun,
  UserPlus,
  Wallet,
} from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useTheme } from "next-themes"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useCan } from "@/components/viewer-provider"
import { navGroups } from "@/config/nav"
import { formatPeso } from "@/features/contributions/ledger"
import { MemberAvatar } from "@/features/members/components/member-avatar"
import { globalSearch, type SearchMeeting, type SearchMember } from "@/features/search/actions"
import { cn, initials } from "@/lib/utils"

const RECENT_KEY = "ga.search.recent"
type Recent = { id: string; name: string; trackingNumber: string }

function readRecent(): Recent[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as Recent[]
  } catch {
    return []
  }
}

function saveRecent(m: Recent) {
  try {
    const next = [m, ...readRecent().filter((r) => r.id !== m.id)].slice(0, 5)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Recent searches are a convenience only.
  }
}

const matches = (text: string, q: string) => {
  const hay = text.toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w))
}

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [results, setResults] = useState<{ members: SearchMember[]; meetings: SearchMeeting[] } | null>(null)
  const [recent, setRecent] = useState<Recent[]>([])
  const router = useRouter()
  const { setTheme } = useTheme()
  const can = useCan()
  const search = useAction(globalSearch, { onSuccess: ({ data }) => data && setResults(data) })
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) setRecent(readRecent())
    else {
      setQ("")
      setResults(null)
    }
  }

  function onQuery(value: string) {
    setQ(value)
    clearTimeout(timer.current)
    if (value.trim().length < 2) {
      setResults(null)
      return
    }
    timer.current = setTimeout(() => search.execute({ q: value }), 200)
  }

  function go(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  function openMember(m: Recent) {
    saveRecent({ id: m.id, name: m.name, trackingNumber: m.trackingNumber })
    go(`/members/${m.id}`)
  }

  const query = q.trim()
  const actions = [
    can("attendance.capture") && { label: "Capture attendance", icon: QrCode, href: "/attendance/capture" },
    can("contribution.collect") && { label: "Collect contribution", icon: Wallet, href: "/contributions/collect" },
    can("member.create") && { label: "Add member", icon: UserPlus, href: "/members/new" },
    { label: "Change password", icon: KeyRound, href: "/change-password" },
  ].filter((a): a is { label: string; icon: typeof QrCode; href: string } => !!a && (!query || matches(a.label, query)))
  const pages = navGroups
    .flatMap((g) => g.items)
    .filter((item) => can(item.permission) && (!query || matches(`${item.title} ${item.description}`, query)))
  const themes = [
    { label: "Light", icon: Sun, value: "light" },
    { label: "Dark", icon: Moon, value: "dark" },
    { label: "System", icon: Monitor, value: "system" },
  ].filter((t) => !query || matches(`theme ${t.label}`, query))

  const members = query.length >= 2 ? (results?.members ?? []) : []
  const meetings = query.length >= 2 ? (results?.meetings ?? []) : []
  const searching = search.isPending || (query.length >= 2 && !results)
  const nothing = !members.length && !meetings.length && !actions.length && !pages.length && !themes.length

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="flex h-10 w-full max-w-sm items-center gap-2 rounded-xl bg-card px-3.5 text-sm text-muted-foreground shadow-card transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Search className="size-4" />
        <span className="truncate">Search members, tracking no.…</span>
        <kbd className="ml-auto hidden rounded-md border px-1.5 font-sans text-[11px] sm:inline">Ctrl K</kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Search"
        description="Find a member or meeting, or jump to a page"
        className="sm:max-w-xl"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={q}
            onValueChange={onQuery}
            placeholder="Name, tracking no., Blk 4 Lot 12, phone, or a meeting date…"
          />
          <CommandList className="max-h-[min(28rem,60svh)]">
            {query.length >= 2 && searching && !members.length && !meetings.length ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Searching…
              </div>
            ) : (
              nothing && <CommandEmpty>No results for “{query}”.</CommandEmpty>
            )}

            {!query && recent.length > 0 && (
              <CommandGroup heading="Recent members">
                {recent.map((m) => (
                  <CommandItem key={m.id} value={`recent-${m.id}`} onSelect={() => openMember(m)}>
                    <History />
                    {m.name}
                    <CommandShortcut className="font-mono">{m.trackingNumber}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {members.length > 0 && (
              <CommandGroup heading="Members">
                {members.map((m) => (
                  <CommandItem key={m.id} value={`member-${m.id}`} onSelect={() => openMember(m)} className="py-2">
                    <MemberAvatar src={m.thumbUrl} initials={initials(m.name)} seed={m.id} className="size-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {m.name}
                        {!m.isActive && <span className="ml-1.5 text-xs text-muted-foreground">(inactive)</span>}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {m.trackingNumber} · {m.blockLot}
                      </span>
                    </span>
                    {m.balance !== null && m.isActive && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                          m.balance > 0 ? "bg-destructive/10 text-destructive" : "bg-success/15 text-success"
                        )}
                      >
                        {m.balance > 0 ? `Owes ${formatPeso(m.balance)}` : "Paid up"}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {meetings.length > 0 && (
              <CommandGroup heading="Meetings">
                {meetings.map((m) => (
                  <CommandItem key={m.id} value={`meeting-${m.id}`} onSelect={() => go(`/meetings/${m.id}`)}>
                    <CalendarDays />
                    <span className="min-w-0 flex-1 truncate">
                      {m.title} · {m.date}
                    </span>
                    <CommandShortcut>{m.status}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {actions.length > 0 && (
              <>
                {(members.length > 0 || meetings.length > 0 || (!query && recent.length > 0)) && <CommandSeparator />}
                <CommandGroup heading="Quick actions">
                  {actions.map((a) => (
                    <CommandItem key={a.href} value={`action-${a.href}`} onSelect={() => go(a.href)}>
                      <a.icon />
                      {a.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {pages.length > 0 && (
              <CommandGroup heading="Pages">
                {pages.map((item) => (
                  <CommandItem key={item.href} value={`page-${item.href}`} onSelect={() => go(item.href)}>
                    <item.icon />
                    {item.title}
                    <CommandShortcut className="hidden sm:inline">{item.description}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {themes.length > 0 && (
              <CommandGroup heading="Theme">
                {themes.map((t) => (
                  <CommandItem
                    key={t.value}
                    value={`theme-${t.value}`}
                    onSelect={() => {
                      onOpenChange(false)
                      setTheme(t.value)
                    }}
                  >
                    <t.icon /> {t.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            Try <span className="font-medium text-foreground">Dela Cruz</span>,{" "}
            <span className="font-mono text-foreground">2026-0012</span>,{" "}
            <span className="font-medium text-foreground">Blk 4 Lot 12</span>,{" "}
            <span className="font-medium text-foreground">0917…</span> or{" "}
            <span className="font-medium text-foreground">Oct 12</span>
          </p>
        </Command>
      </CommandDialog>
    </>
  )
}
