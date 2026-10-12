import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Download, QrCode, Search, Settings2, Upload, Wallet } from "lucide-react"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { VoidPaymentButton } from "@/features/contributions/components/void-payment-button"
import { MONTH_PATTERN, addMonths, formatMonth, formatPeso, paymentMethodLabel } from "@/features/contributions/ledger"
import {
  PAYMENT_PAGE_SIZE,
  activeMemberBalances,
  currentMonth,
  listPayments,
  monthSummary,
} from "@/features/contributions/queries"
import { dateToDay, formatDay, manilaToday } from "@/lib/dates"
import { fullName } from "@/lib/names"
import { can, requireViewer } from "@/lib/rbac"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Contributions" }

const DAY = /^\d{4}-\d{2}-\d{2}$/

export default async function ContributionsPage({ searchParams }: PageProps<"/contributions">) {
  const viewer = await requireViewer()
  if (!can(viewer, "contribution.view")) return <NoAccess what="contributions" />

  const params = await searchParams
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string).trim() : "")
  const thisMonth = currentMonth()
  const month = MONTH_PATTERN.test(str("month")) && str("month") <= thisMonth ? str("month") : thisMonth
  const view = str("view") === "payments" ? "payments" : "balances"
  const q = str("q").slice(0, 60)

  const href = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams()
    const merged = { month: month === thisMonth ? null : month, view: view === "balances" ? null : view, ...next }
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v)
    const s = sp.toString()
    return s ? `/contributions?${s}` : "/contributions"
  }

  const [summary, balances] = await Promise.all([monthSummary(month), activeMemberBalances()])
  const owing = balances.filter((b) => b.ledger.balance > 0)
  const outstanding = owing.reduce((sum, b) => sum + b.ledger.balance, 0)
  const overdue = balances.filter((b) => b.ledger.overdueMonths > 0).length

  return (
    <>
      <PageHeader
        title="Contributions"
        description="Monthly contributions collected from member households. Record-keeping only — no online payments."
        actions={
          <>
            {can(viewer, "contribution.manage") && (
              <Button asChild size="lg" variant="ghost">
                <Link href="/settings#contributions">
                  <Settings2 /> Rates
                </Link>
              </Button>
            )}
            {can(viewer, "contribution.manage") && (
              <Button asChild size="lg" variant="outline">
                <Link href="/contributions/import">
                  <Upload /> Import
                </Link>
              </Button>
            )}
            {can(viewer, "contribution.collect") && (
              <Button asChild size="lg">
                <Link href="/contributions/collect">
                  <QrCode /> Collect
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="mb-3 flex items-center gap-1">
        <Button asChild variant="ghost" size="icon" aria-label="Previous month">
          <Link href={href({ month: addMonths(month, -1), page: null })}>
            <ChevronLeft />
          </Link>
        </Button>
        <p className="min-w-36 text-center text-lg font-bold">{formatMonth(month, "long")}</p>
        {month < thisMonth ? (
          <Button asChild variant="ghost" size="icon" aria-label="Next month">
            <Link href={href({ month: addMonths(month, 1), page: null })}>
              <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" size="icon" disabled aria-label="Next month">
            <ChevronRight />
          </Button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Collected"
          value={formatPeso(summary.collected)}
          hint={`${summary.payments} payment${summary.payments === 1 ? "" : "s"} dated this month`}
        />
        <Stat
          label="Expected"
          value={formatPeso(summary.expected)}
          hint={`${summary.owing} households × ${formatPeso(summary.rate)}`}
        />
        <Stat
          label="Collection rate"
          value={summary.ratePct === null ? "—" : `${summary.ratePct}%`}
          hint="Collected ÷ expected"
          bar={summary.ratePct}
        />
        <Stat
          label="Outstanding today"
          value={formatPeso(outstanding)}
          hint={`${owing.length} with a balance · ${overdue} overdue`}
          tone={outstanding > 0 ? "danger" : undefined}
        />
      </div>

      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <div className="flex gap-1 rounded-xl bg-muted p-1">
            {(
              [
                ["balances", "Balances"],
                ["payments", "Payments"],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                href={href({ view: key === "balances" ? null : key, q: null, page: null })}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground",
                  view === key && "bg-card text-foreground shadow-card"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        {view === "balances" ? (
          <Balances rows={balances} q={q} showAll={str("all") === "1"} month={month === thisMonth ? null : month} />
        ) : (
          <Payments
            params={{ from: str("from"), to: str("to"), q, voided: str("voided") === "1", page: str("page") }}
            month={month}
            canVoid={can(viewer, "contribution.void")}
            canExport={can(viewer, "contribution.export")}
            href={href}
          />
        )}
      </Card>
    </>
  )
}

function Stat({
  label,
  value,
  hint,
  bar,
  tone,
}: {
  label: string
  value: string
  hint: string
  bar?: number | null
  tone?: "danger"
}) {
  return (
    <Card className="gap-1 px-4 py-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-extrabold tabular-nums", tone === "danger" && "text-destructive")}>{value}</p>
      {bar != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, bar)}%` }} />
        </div>
      )}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </Card>
  )
}

function Balances({
  rows,
  q,
  showAll,
  month,
}: {
  rows: Awaited<ReturnType<typeof activeMemberBalances>>
  q: string
  showAll: boolean
  month: string | null
}) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const shown = rows
    .filter((r) => showAll || r.ledger.balance > 0)
    .filter((r) => words.every((w) => `${r.name} ${r.trackingNumber}`.toLowerCase().includes(w)))
    .sort((a, b) => b.ledger.balance - a.ledger.balance || a.name.localeCompare(b.name))

  return (
    <>
      <form className="flex flex-wrap items-center gap-2 border-b px-4 py-3" action="/contributions">
        {month && <input type="hidden" name="month" value={month} />}
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Name or tracking no." className="pl-9" aria-label="Search" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="all" value="1" defaultChecked={showAll} className="size-4 accent-primary" />
          Include fully paid
        </label>
        <Button type="submit" variant="outline">
          Apply
        </Button>
      </form>
      {shown.length === 0 ? (
        <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
          <Wallet className="size-8 text-muted-foreground" />
          <p className="font-semibold">{showAll || q ? "No members match" : "Everyone is paid up"}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Member</TableHead>
              <TableHead className="hidden sm:table-cell">Paid through</TableHead>
              <TableHead className="hidden md:table-cell">Overdue</TableHead>
              <TableHead className="pr-5 text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="pl-5">
                  <Link href={`/members/${r.id}`} className="font-semibold hover:underline">
                    {r.name}
                  </Link>
                  <p className="font-mono text-xs text-muted-foreground">
                    {r.trackingNumber} · Blk {r.blockNumber} Lot {r.lotNumber}
                  </p>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {r.ledger.paidThrough ? formatMonth(r.ledger.paidThrough) : "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {r.ledger.overdueMonths > 0 ? (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                      {r.ledger.overdueMonths} month{r.ledger.overdueMonths === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell className="pr-5 text-right font-semibold tabular-nums">
                  {r.ledger.balance > 0 ? (
                    <span className="text-destructive">{formatPeso(r.ledger.balance)}</span>
                  ) : r.ledger.credit > 0 ? (
                    <span className="text-success">+{formatPeso(r.ledger.credit)}</span>
                  ) : (
                    <span className="text-muted-foreground">₱0</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}

async function Payments({
  params,
  month,
  canVoid,
  canExport,
  href,
}: {
  params: { from: string; to: string; q: string; voided: boolean; page: string }
  month: string
  canVoid: boolean
  canExport: boolean
  href: (next: Record<string, string | null>) => string
}) {
  const today = manilaToday()
  const monthEnd = dateToDay(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)))
  const from = DAY.test(params.from) ? params.from : `${month}-01`
  const to = DAY.test(params.to) && params.to >= from ? params.to : monthEnd < today ? monthEnd : today
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1)
  const { rows, total, sum } = await listPayments({ from, to, q: params.q, voided: params.voided, page })
  const pages = Math.max(1, Math.ceil(total / PAYMENT_PAGE_SIZE))
  const filterQs = { from, to, q: params.q || null, voided: params.voided ? "1" : null }
  const exportQs = new URLSearchParams({ from, to })

  return (
    <>
      <form className="flex flex-wrap items-end gap-2 border-b px-4 py-3" action="/contributions">
        <input type="hidden" name="view" value="payments" />
        <input type="hidden" name="month" value={month} />
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          From
          <Input type="date" name="from" defaultValue={from} max={today} className="w-40" />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          To
          <Input type="date" name="to" defaultValue={to} max={today} className="w-40" />
        </label>
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={params.q}
            placeholder="Name or tracking no."
            className="pl-9"
            aria-label="Search"
          />
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="voided"
            value="1"
            defaultChecked={params.voided}
            className="size-4 accent-primary"
          />
          Show voided
        </label>
        <Button type="submit" variant="outline">
          Apply
        </Button>
        {canExport && (
          <>
            <Button asChild variant="ghost">
              <a href={`/api/contributions/export?${exportQs}&format=xlsx`}>
                <Download /> Excel
              </a>
            </Button>
            <Button asChild variant="ghost">
              <a href={`/api/contributions/export?${exportQs}&format=csv`}>
                <Download /> CSV
              </a>
            </Button>
          </>
        )}
      </form>
      <p className="border-b px-5 py-2 text-sm text-muted-foreground">
        {total} payment{total === 1 ? "" : "s"} · total{" "}
        <span className="font-semibold text-foreground">{formatPeso(sum)}</span>
        {params.voided && " (voided excluded from total)"}
      </p>
      {rows.length === 0 ? (
        <p className="px-6 py-14 text-center text-sm text-muted-foreground">No payments in this range.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Date</TableHead>
              <TableHead>Member</TableHead>
              <TableHead className="hidden md:table-cell">Method</TableHead>
              <TableHead className="hidden lg:table-cell">Recorded by</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {canVoid && <TableHead className="w-12 pr-3" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const name = fullName(p.member)
              return (
                <TableRow key={p.id} className={cn(p.voidedAt && "text-muted-foreground")}>
                  <TableCell className="pl-5 whitespace-nowrap">{formatDay(p.paidOn, "MMM d, yyyy")}</TableCell>
                  <TableCell className="whitespace-normal">
                    <Link href={`/members/${p.member.id}`} className="font-semibold hover:underline">
                      {name}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">{p.member.trackingNumber}</p>
                    {p.voidedAt && <p className="text-xs text-destructive">Voided: {p.voidReason}</p>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {paymentMethodLabel(p.method)}
                    {p.reference && <p className="text-xs text-muted-foreground">Ref {p.reference}</p>}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {p.recordedBy.name}
                    <p className="text-xs text-muted-foreground">
                      {p.source === "QR" ? "QR scan" : p.source === "IMPORT" ? "Imported" : "Manual"}
                    </p>
                  </TableCell>
                  <TableCell className={cn("text-right font-semibold tabular-nums", p.voidedAt && "line-through")}>
                    {formatPeso(p.amount)}
                  </TableCell>
                  {canVoid && (
                    <TableCell className="pr-3">
                      {!p.voidedAt && (
                        <VoidPaymentButton
                          id={p.id}
                          summary={`${formatPeso(p.amount)} from ${name} on ${formatDay(p.paidOn, "MMM d, yyyy")}`}
                        />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t px-5 py-3 text-sm">
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={href({ ...filterQs, page: String(page - 1) })}>Previous</Link>
              </Button>
            )}
            {page < pages && (
              <Button asChild variant="outline" size="sm">
                <Link href={href({ ...filterQs, page: String(page + 1) })}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
