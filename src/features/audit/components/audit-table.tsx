"use client"

import { useState } from "react"
import { History } from "lucide-react"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { auditActionTone } from "@/features/audit/labels"
import { cn } from "@/lib/utils"

type Json = unknown

export type AuditRow = {
  id: string
  time: string
  action: string
  actionLabel: string
  actor: { name: string; email: string } | null
  entityType: string | null
  entityId: string | null
  before: Json
  after: Json
  metadata: Json
  ipAddress: string | null
  userAgent: string | null
}

const toneClass = {
  danger: "bg-destructive/10 text-destructive",
  success: "bg-success/15 text-success",
  gold: "bg-accent text-accent-foreground",
  muted: "bg-muted text-muted-foreground",
} as const

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const [open, setOpen] = useState<AuditRow | null>(null)

  if (rows.length === 0) {
    return (
      <div className="grid justify-items-center gap-2 px-6 py-16 text-center">
        <History className="size-8 text-muted-foreground" />
        <p className="font-semibold">No activity found</p>
        <p className="text-sm text-muted-foreground">Try a different filter or date range.</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">When</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="hidden sm:table-cell">By</TableHead>
            <TableHead className="hidden lg:table-cell">Record</TableHead>
            <TableHead className="hidden pr-5 xl:table-cell">IP address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              tabIndex={0}
              role="button"
              aria-label={`${row.actionLabel} at ${row.time}. Show details.`}
              onClick={() => setOpen(row)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(row))}
              className="cursor-pointer outline-none hover:bg-accent/60 focus-visible:bg-accent/60"
            >
              <TableCell className="py-3 pl-5 text-sm whitespace-nowrap tabular-nums">{row.time}</TableCell>
              <TableCell>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
                    toneClass[auditActionTone(row.action)]
                  )}
                >
                  {row.actionLabel}
                </span>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {row.actor ? (
                  <span className="text-sm font-medium">{row.actor.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">System / anonymous</span>
                )}
              </TableCell>
              <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                {row.entityType ?? "—"}
              </TableCell>
              <TableCell className="hidden pr-5 font-mono text-xs text-muted-foreground xl:table-cell">
                {row.ipAddress ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.actionLabel}</SheetTitle>
                <SheetDescription>{open.time} (Philippine time)</SheetDescription>
              </SheetHeader>
              <div className="grid gap-5 px-4 pb-6">
                <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">By</dt>
                  <dd>{open.actor ? `${open.actor.name} (${open.actor.email})` : "System / anonymous"}</dd>
                  <dt className="text-muted-foreground">Action key</dt>
                  <dd className="font-mono text-xs">{open.action}</dd>
                  <dt className="text-muted-foreground">Record</dt>
                  <dd className="font-mono text-xs break-all">
                    {open.entityType ? `${open.entityType} · ${open.entityId}` : "—"}
                  </dd>
                  <dt className="text-muted-foreground">IP address</dt>
                  <dd className="font-mono text-xs">{open.ipAddress ?? "—"}</dd>
                  <dt className="text-muted-foreground">Device</dt>
                  <dd className="text-xs break-words text-muted-foreground">{open.userAgent ?? "—"}</dd>
                </dl>
                <Changes before={open.before} after={open.after} />
                {open.metadata != null && <JsonBlock title="Details" value={open.metadata} />}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function Changes({ before, after }: { before: Json; after: Json }) {
  const b = (before && typeof before === "object" ? before : {}) as Record<string, Json>
  const a = (after && typeof after === "object" ? after : {}) as Record<string, Json>
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])]
  if (keys.length === 0) return null

  return (
    <section>
      <h3 className="mb-2 text-sm font-bold">Changes</h3>
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-xs">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Field</th>
              <th className="px-3 py-2 font-medium">Before</th>
              <th className="px-3 py-2 font-medium">After</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key} className="border-t align-top">
                <td className="px-3 py-2 font-medium">{key}</td>
                <td className="px-3 py-2 break-words text-destructive">{show(b[key])}</td>
                <td className="px-3 py-2 break-words text-success">{show(a[key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function show(value: Json) {
  if (value === undefined) return <span className="text-muted-foreground">—</span>
  if (Array.isArray(value))
    return value.length ? value.join(", ") : <span className="text-muted-foreground">(none)</span>
  if (value === null) return <span className="text-muted-foreground">(empty)</span>
  if (typeof value === "object") return <code>{JSON.stringify(value)}</code>
  return String(value)
}

function JsonBlock({ title, value }: { title: string; value: Json }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      <pre className="overflow-x-auto rounded-xl bg-muted p-3 font-mono text-xs">{JSON.stringify(value, null, 2)}</pre>
    </section>
  )
}
