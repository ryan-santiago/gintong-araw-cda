import Link from "next/link"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { VoidPaymentButton } from "@/features/contributions/components/void-payment-button"
import { formatMonth, formatPeso, paymentMethodLabel, type Ledger } from "@/features/contributions/ledger"
import { memberContributions } from "@/features/contributions/queries"
import { formatDay, formatManila } from "@/lib/dates"
import { cn } from "@/lib/utils"

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]

export async function MemberContributionsCard({
  member,
  canCollect,
  canVoid,
}: {
  member: { id: string; name: string; memberSince: Date | null; isActive: boolean; deletedAt: Date | null }
  canCollect: boolean
  canVoid: boolean
}) {
  const { ledger, payments } = await memberContributions(member)
  const valid = payments.filter((p) => !p.voidedAt)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Contributions</CardTitle>
        <CardDescription>
          Owed monthly from {formatMonth(ledger.startMonth, "long")}. Payments apply to the oldest unpaid month first.
        </CardDescription>
        {canCollect && member.isActive && (
          <CardAction>
            <Button asChild size="sm">
              <Link href={`/contributions/collect?member=${member.id}`}>
                <Plus /> Record payment
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className={cn("rounded-xl px-3 py-2.5", ledger.balance > 0 ? "bg-destructive/10" : "bg-success/10")}>
            <p
              className={cn("text-xl font-bold tabular-nums", ledger.balance > 0 ? "text-destructive" : "text-success")}
            >
              {ledger.balance > 0
                ? formatPeso(ledger.balance)
                : ledger.credit > 0
                  ? `+${formatPeso(ledger.credit)}`
                  : "₱0"}
            </p>
            <p className="text-xs text-muted-foreground">
              {ledger.balance > 0
                ? `Balance${ledger.overdueMonths ? ` · ${ledger.overdueMonths} mo overdue` : ""}`
                : ledger.credit > 0
                  ? "Advance credit"
                  : "No balance"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/60 px-3 py-2.5">
            <p className="text-xl font-bold">{ledger.paidThrough ? formatMonth(ledger.paidThrough) : "—"}</p>
            <p className="text-xs text-muted-foreground">Paid through</p>
          </div>
          <div className="rounded-xl bg-muted/60 px-3 py-2.5">
            <p className="text-xl font-bold tabular-nums">{formatPeso(ledger.totalPaid)}</p>
            <p className="text-xs text-muted-foreground">
              {valid.length} payment{valid.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <MonthGrid ledger={ledger} />

        {payments.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No payments recorded yet.
          </p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto rounded-xl border">
            {payments.map((p) => (
              <li key={p.id} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", p.voidedAt && "opacity-70")}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {formatDay(p.paidOn, "MMM d, yyyy")}
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {paymentMethodLabel(p.method)}
                      {p.reference && ` · Ref ${p.reference}`}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.voidedAt
                      ? `Voided by ${p.voidedBy?.name ?? "?"}: ${p.voidReason}`
                      : `${p.source === "IMPORT" ? "Imported" : "Recorded"} by ${p.recordedBy.name} · ${formatManila(p.createdAt, "MMM d, h:mm a")}${p.notes ? ` · ${p.notes}` : ""}`}
                  </p>
                </div>
                <span className={cn("font-semibold tabular-nums", p.voidedAt && "line-through")}>
                  {formatPeso(p.amount)}
                </span>
                {canVoid &&
                  (p.voidedAt ? (
                    <span className="w-9" />
                  ) : (
                    <VoidPaymentButton
                      id={p.id}
                      summary={`${formatPeso(p.amount)} from ${member.name} on ${formatDay(p.paidOn, "MMM d, yyyy")}`}
                    />
                  ))}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

/** One row per year: each month paid (green), partial (gold), unpaid (red) or not owed (blank). */
function MonthGrid({ ledger }: { ledger: Ledger }) {
  const byMonth = new Map(ledger.months.map((m) => [m.month, m]))
  const first = Number(ledger.startMonth.slice(0, 4))
  const lastMonth = ledger.months.at(-1)?.month ?? ledger.endMonth
  const last = Math.max(first, Number(lastMonth.slice(0, 4)))
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i).reverse()

  return (
    <div className="grid gap-2">
      {years.map((year) => (
        <div key={year} className="grid grid-cols-[3rem_repeat(12,minmax(0,1fr))] items-center gap-1">
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">{year}</span>
          {MONTHS.map((label, i) => {
            const month = `${year}-${String(i + 1).padStart(2, "0")}`
            const m = byMonth.get(month)
            const future = month > ledger.endMonth
            const title = m
              ? `${formatMonth(month)}: ${m.status === "paid" ? "paid" : m.status === "partial" ? `${formatPeso(m.paid)} of ${formatPeso(m.due)}` : `unpaid ${formatPeso(m.due)}`}${future ? " (advance)" : ""}`
              : `${formatMonth(month)}: not owed`
            return (
              <span
                key={month}
                title={title}
                className={cn(
                  "grid h-7 place-items-center rounded-md text-[11px] font-semibold",
                  !m && "bg-muted/40 text-muted-foreground/60",
                  m?.status === "paid" && "bg-success text-white",
                  m?.status === "partial" && "bg-primary text-primary-foreground",
                  m?.status === "unpaid" && "bg-destructive/15 text-destructive"
                )}
              >
                {label}
              </span>
            )
          })}
        </div>
      ))}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <Legend className="bg-success" label="Paid" />
        <Legend className="bg-primary" label="Partial" />
        <Legend className="bg-destructive/15" label="Unpaid" />
        <Legend className="bg-muted/40" label="Not owed" />
      </div>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm", className)} /> {label}
    </span>
  )
}
