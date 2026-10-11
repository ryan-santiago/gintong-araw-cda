"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Download, FileSpreadsheet, FileText, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BatchIdCardsDialog } from "@/features/id-card/components/batch-id-cards-dialog"
import { MEMBER_POSITIONS } from "@/features/members/positions"
import { cn } from "@/lib/utils"

const ALL = "__all"
const SORTS = [
  { value: "name", label: "Name (A–Z)" },
  { value: "tracking", label: "Tracking no." },
  { value: "blocklot", label: "Block / Lot" },
  { value: "position", label: "Position" },
  { value: "newest", label: "Newest first" },
]

export function MembersToolbar({
  counts,
  blocks,
  canExport,
  canPrintIds,
}: {
  counts: { active: number; inactive: number; atRisk: number }
  blocks: string[]
  canExport: boolean
  canPrintIds: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(searchParams.get("q") ?? "")
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  function hrefWith(updates: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== ALL) sp.set(key, value)
      else sp.delete(key)
    }
    sp.delete("page")
    const s = sp.toString()
    return s ? `${pathname}?${s}` : pathname
  }

  function onSearch(value: string) {
    setQ(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => router.replace(hrefWith({ q: value.trim() || undefined })), 300)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  const status = searchParams.get("risk") === "1" ? "risk" : (searchParams.get("status") ?? "active")
  const tabs = [
    { value: "active", label: "Active", count: counts.active },
    { value: "risk", label: "At risk", count: counts.atRisk },
    { value: "inactive", label: "Inactive", count: counts.inactive },
    { value: "all", label: "All", count: counts.active + counts.inactive },
  ]

  const exportHref = (format: "xlsx" | "csv") => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.delete("page")
    sp.set("format", format)
    return `/api/members/export?${sp.toString()}`
  }

  return (
    <div className="mb-4 grid gap-3">
      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center">
        <nav
          aria-label="Filter by status"
          className="flex w-fit max-w-full shrink-0 gap-1 overflow-x-auto rounded-xl bg-muted p-1"
        >
          {tabs.map((tab) => {
            const active = tab.value === status
            return (
              <Link
                key={tab.value}
                href={hrefWith(
                  tab.value === "risk"
                    ? { risk: "1", status: undefined }
                    : { risk: undefined, status: tab.value === "active" ? undefined : tab.value }
                )}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  active && "bg-card text-foreground shadow-card"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    tab.value === "risk" && tab.count > 0 ? "bg-warning text-white" : "bg-background"
                  )}
                >
                  {tab.count}
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search name, tracking no. or phone"
            className="pl-9"
            aria-label="Search members"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={searchParams.get("block") ?? ALL} onValueChange={(v) => router.push(hrefWith({ block: v }))}>
            <SelectTrigger className="w-full sm:w-36" aria-label="Block">
              <SelectValue placeholder="All blocks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All blocks</SelectItem>
              {blocks.map((b) => (
                <SelectItem key={b} value={b}>
                  Block {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={searchParams.get("position") ?? ALL}
            onValueChange={(v) => router.push(hrefWith({ position: v }))}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Position">
              <SelectValue placeholder="All positions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All positions</SelectItem>
              <SelectItem value="OFFICERS">Officers only</SelectItem>
              {MEMBER_POSITIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={searchParams.get("sort") ?? "name"}
            onValueChange={(v) => router.push(hrefWith({ sort: v === "name" ? undefined : v }))}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canPrintIds && <BatchIdCardsDialog />}
          {canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10">
                  <Download /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Exports the members matching the current filters
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <a href={exportHref("xlsx")} download>
                    <FileSpreadsheet /> Excel (.xlsx)
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={exportHref("csv")} download>
                    <FileText /> CSV
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  )
}
