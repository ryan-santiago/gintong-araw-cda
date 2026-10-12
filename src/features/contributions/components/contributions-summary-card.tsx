import Link from "next/link"
import { QrCode } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMonth, formatPeso } from "@/features/contributions/ledger"
import { activeMemberBalances, currentMonth, monthSummary } from "@/features/contributions/queries"
import { cn } from "@/lib/utils"

/** Dashboard card: this month's collections vs expected, and who is behind. */
export async function ContributionsSummaryCard({ canCollect }: { canCollect: boolean }) {
  const month = currentMonth()
  const [summary, balances] = await Promise.all([monthSummary(month), activeMemberBalances()])
  const outstanding = balances.reduce((sum, b) => sum + b.ledger.balance, 0)
  const overdue = balances.filter((b) => b.ledger.overdueMonths > 0).length
  const paidUp = balances.filter((b) => b.ledger.balance === 0).length
  const pct = summary.ratePct ?? 0

  return (
    <Card className="lg:col-span-12">
      <CardHeader>
        <CardTitle className="font-semibold">Contributions · {formatMonth(month, "long")}</CardTitle>
        <CardDescription>
          {formatPeso(summary.rate)} a month per household · {summary.owing} households owing this month
        </CardDescription>
        <CardAction className="flex gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/contributions">Details</Link>
          </Button>
          {canCollect && (
            <Button asChild size="sm">
              <Link href="/contributions/collect">
                <QrCode /> Collect
              </Link>
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Collected this month</p>
          <p className="text-[28px] font-bold tracking-tight tabular-nums">{formatPeso(summary.collected)}</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {summary.ratePct === null ? "Nothing expected yet" : `${pct}% of ${formatPeso(summary.expected)} expected`}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Outstanding balance</p>
          <p className={cn("text-[28px] font-bold tracking-tight tabular-nums", outstanding > 0 && "text-destructive")}>
            {formatPeso(outstanding)}
          </p>
          <p className="text-xs text-muted-foreground">All unpaid months through {formatMonth(month)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Households overdue</p>
          <p className="text-[28px] font-bold tracking-tight tabular-nums">{overdue}</p>
          <p className="text-xs text-muted-foreground">With an unpaid month before {formatMonth(month)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Fully paid</p>
          <p className="text-[28px] font-bold tracking-tight tabular-nums">
            {paidUp}
            <span className="text-base font-semibold text-muted-foreground"> / {balances.length}</span>
          </p>
          <p className="text-xs text-muted-foreground">Active households with no balance</p>
        </div>
      </CardContent>
    </Card>
  )
}
