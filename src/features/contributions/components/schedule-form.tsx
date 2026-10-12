"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Save, Trash2, TriangleAlert, Wallet } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveContributionSchedule } from "@/features/contributions/actions"
import { addMonths, formatMonth, type Schedule } from "@/features/contributions/ledger"

type RateRow = { from: string; amount: string }

export function ScheduleForm({ initial, currentMonth }: { initial: Schedule; currentMonth: string }) {
  const router = useRouter()
  const [startMonth, setStartMonth] = useState(initial.startMonth)
  const [rates, setRates] = useState<RateRow[]>(initial.rates.map((r) => ({ from: r.from, amount: String(r.amount) })))
  const { execute, isPending, result } = useAction(saveContributionSchedule, {
    onSuccess: () => {
      toast.success("Contribution rates saved.")
      router.refresh()
    },
  })
  const errors = result.validationErrors
  const ratesError = errors?.rates && !Array.isArray(errors.rates) ? errors.rates._errors?.[0] : undefined
  const message =
    ratesError ??
    errors?.startMonth?._errors?.[0] ??
    (errors ? "Check the months and amounts (amounts above zero, at most 2 decimals)." : undefined) ??
    result.serverError

  const sorted = [...rates].filter((r) => r.from).sort((a, b) => a.from.localeCompare(b.from))
  const changesPast =
    JSON.stringify(sorted.filter((r) => r.from <= currentMonth).map((r) => [r.from, Number(r.amount)])) !==
      JSON.stringify(initial.rates.filter((r) => r.from <= currentMonth).map((r) => [r.from, r.amount])) ||
    startMonth !== initial.startMonth

  return (
    <Card id="contributions" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <Wallet className="size-4 text-secondary" /> Contributions
        </CardTitle>
        <CardDescription>
          Monthly contribution per household. Each month uses the rate in effect for that month, so a rate increase
          doesn&apos;t change what older months cost.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            execute({ startMonth, rates: rates.map((r) => ({ from: r.from, amount: Number(r.amount) })) })
          }}
        >
          <div className="grid max-w-xs gap-2">
            <Label htmlFor="startMonth">Dues start from</Label>
            <Input
              id="startMonth"
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Households owe from this month, or from their Member Since month if it is later.
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Monthly rate</Label>
            <div className="grid gap-2">
              {rates.map((rate, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <span className="w-28 text-sm text-muted-foreground">{i === 0 ? "From" : "Then from"}</span>
                  <Input
                    type="month"
                    value={rate.from}
                    onChange={(e) =>
                      setRates((all) => all.map((r, j) => (j === i ? { ...r, from: e.target.value } : r)))
                    }
                    className="w-44"
                    aria-label="Effective month"
                    required
                  />
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                      ₱
                    </span>
                    <Input
                      value={rate.amount}
                      onChange={(e) =>
                        setRates((all) =>
                          all.map((r, j) => (j === i ? { ...r, amount: e.target.value.replace(/[^\d.]/g, "") } : r))
                        )
                      }
                      inputMode="decimal"
                      className="w-32 pl-7 tabular-nums"
                      aria-label="Monthly amount in pesos"
                      required
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">per month</span>
                  {rates.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove rate"
                      onClick={() => setRates((all) => all.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() =>
                setRates((all) => [...all, { from: addMonths(currentMonth, 1), amount: all.at(-1)?.amount ?? "" }])
              }
            >
              <Plus /> Add rate change
            </Button>
          </div>

          {sorted.length > 0 && (
            <ul className="grid gap-1 rounded-xl bg-muted/60 px-4 py-3 text-sm">
              {sorted.map((r, i) => (
                <li key={r.from}>
                  <span className="font-semibold">
                    {formatMonth(r.from)}
                    {sorted[i + 1] ? ` – ${formatMonth(addMonths(sorted[i + 1]!.from, -1))}` : " onward"}
                  </span>
                  : ₱{Number(r.amount || 0).toLocaleString("en-PH")} a month
                </li>
              ))}
            </ul>
          )}

          {changesPast && (
            <p className="flex gap-2 rounded-xl bg-warning/10 px-3 py-2 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
              This changes months that have already started, so every member&apos;s balance will be recalculated.
            </p>
          )}
          {message && <p className="text-sm font-medium text-destructive">{message}</p>}

          <Button type="submit" className="justify-self-start" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Save />} Save rates
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
