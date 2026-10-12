"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Check, CircleAlert, Keyboard, Loader2, QrCode, Search, TriangleAlert, UserRound, X } from "lucide-react"
import { useAction } from "next-safe-action/hooks"

import { QrCamera, beep } from "@/components/shared/qr-camera"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getCollectStatus,
  lookupMemberByCard,
  lookupMemberById,
  recordPayment,
  searchMembersForPayment,
  type PayMember,
} from "@/features/contributions/actions"
import { PAYMENT_METHODS, formatMonth, formatPeso, type PaymentMethodValue } from "@/features/contributions/ledger"
import type { CollectStatus } from "@/features/contributions/queries"
import { cn } from "@/lib/utils"

const time = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" })
const fmtTime = (iso: string) => time.format(new Date(iso))

type Done = { member: PayMember; amount: number }

export function CollectScreen({
  initialStatus,
  today,
  initialMemberId,
}: {
  initialStatus: CollectStatus
  today: string
  /** Opened from a member page: start with that member selected. */
  initialMemberId?: string
}) {
  const [mode, setMode] = useState<"scan" | "manual">("scan")
  const [member, setMember] = useState<PayMember | null>(null)
  const [source, setSource] = useState<"QR" | "MANUAL">("QR")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<Done | null>(null)
  const [status, setStatus] = useState(initialStatus)

  const statusAction = useAction(getCollectStatus, { onSuccess: ({ data }) => data && setStatus(data) })
  const refresh = useCallback(() => statusAction.execute(), [statusAction])
  useEffect(() => {
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [refresh])

  const byCard = useAction(lookupMemberByCard)
  const byId = useAction(lookupMemberById)

  async function onScan(text: string) {
    const res = await byCard.executeAsync({ text })
    if (res?.data?.status === "found") {
      beep("ok")
      open(res.data.member, "QR")
    } else {
      beep("error")
      setDone(null)
      setError(res?.data?.status === "invalid" ? res.data.message : (res?.serverError ?? "Couldn't read that ID."))
    }
  }

  async function onPick(memberId: string) {
    const res = await byId.executeAsync({ memberId })
    if (res?.data?.status === "found") open(res.data.member, "MANUAL")
    else setError(res?.serverError ?? "Member not found.")
  }

  function open(m: PayMember, via: "QR" | "MANUAL") {
    setError(null)
    setDone(null)
    setSource(via)
    setMember(m)
  }

  // Opened from a member page.
  const opened = useRef(false)
  useEffect(() => {
    if (!initialMemberId || opened.current) return
    opened.current = true
    setMode("manual")
    void onPick(initialMemberId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [initialMemberId])

  function onRecorded(result: Done) {
    beep("ok")
    setMember(null)
    setDone(result)
    refresh()
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid content-start gap-4">
        <Card className="flex-row items-center justify-between gap-3 px-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Collected today</p>
            <p className="text-3xl leading-tight font-extrabold tabular-nums">{formatPeso(status.total)}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>
              {status.count} payment{status.count === 1 ? "" : "s"}
            </p>
            <p>
              You: <span className="font-semibold text-foreground">{formatPeso(status.mine)}</span> ({status.mineCount})
            </p>
          </div>
        </Card>

        {member ? (
          <PaymentPanel
            key={member.id}
            member={member}
            source={source}
            today={today}
            onCancel={() => setMember(null)}
            onRecorded={onRecorded}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Find member by">
              {(
                [
                  ["scan", QrCode, "Scan QR"],
                  ["manual", Keyboard, "Manual"],
                ] as const
              ).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => setMode(value)}
                  className={cn(
                    "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-muted-foreground",
                    mode === value && "bg-card text-foreground shadow-card"
                  )}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>

            {mode === "scan" ? (
              <Card className="overflow-hidden p-0">
                <QrCamera onCode={onScan} onManual={() => setMode("manual")}>
                  {(done || error || byCard.isPending) && (
                    <Feedback done={done} error={error} pending={byCard.isPending} overlay />
                  )}
                </QrCamera>
              </Card>
            ) : (
              <>
                <ManualSearch onPick={onPick} disabled={byId.isPending} />
                <Feedback done={done} error={error} pending={byId.isPending} />
              </>
            )}
          </>
        )}
      </div>

      <Card className="gap-0 self-start py-0">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <p className="font-semibold">Recent payments</p>
          {statusAction.isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        {status.recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nothing recorded in the last 24 hours.</p>
        ) : (
          <ul className="divide-y">
            {status.recent.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{p.trackingNumber}</span>
                </span>
                <span className="text-right text-xs">
                  <span className="block font-semibold tabular-nums">{formatPeso(p.amount)}</span>
                  <span className="text-muted-foreground">{fmtTime(p.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t px-5 py-3">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/contributions">All payments</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}

function Avatar({ member, size = "lg" }: { member: Pick<PayMember, "thumbUrl">; size?: "lg" | "sm" }) {
  return (
    <span
      className={cn(
        "relative shrink-0 overflow-hidden bg-muted",
        size === "lg" ? "size-16 rounded-2xl" : "size-11 rounded-full"
      )}
    >
      {member.thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed R2 thumbnail
        <img src={member.thumbUrl} alt="" className="size-full object-cover" />
      ) : (
        <UserRound className={cn("m-auto text-muted-foreground", size === "lg" ? "mt-4 size-8" : "mt-2.5 size-6")} />
      )}
    </span>
  )
}

function Feedback({
  done,
  error,
  pending,
  overlay,
}: {
  done: Done | null
  error: string | null
  pending: boolean
  overlay?: boolean
}) {
  if (pending) {
    return (
      <Card className="flex-row items-center gap-3 px-5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Looking up member…
      </Card>
    )
  }
  if (error) {
    return (
      <Card
        className={cn(
          "animate-[shake_0.3s_ease-in-out] flex-row items-center gap-3 border-2 border-destructive px-5",
          overlay ? "bg-card/95 shadow-lg backdrop-blur" : "bg-destructive/10"
        )}
        aria-live="assertive"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive text-white">
          <CircleAlert className="size-5" />
        </span>
        <p className="text-sm font-semibold">{error}</p>
      </Card>
    )
  }
  if (!done) {
    return overlay ? null : (
      <Card className="flex-row items-center gap-3 border border-dashed px-5 text-sm text-muted-foreground shadow-none">
        <Search className="size-5" /> Find the member by tracking number or name.
      </Card>
    )
  }
  const m = done.member
  return (
    <Card
      className={cn(
        "animate-in flex-row items-center gap-4 border-2 border-success px-5 duration-200 zoom-in-95 fade-in",
        overlay ? "bg-card/95 py-3 shadow-lg backdrop-blur" : "bg-success/10"
      )}
      aria-live="polite"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success text-white">
        <Check className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">Recorded {formatPeso(done.amount)}</p>
        <p className="truncate text-lg font-extrabold">{m.name}</p>
        <p className="text-xs text-muted-foreground">
          {m.balance > 0
            ? `Remaining balance ${formatPeso(m.balance)}`
            : m.paidThrough
              ? `Paid through ${formatMonth(m.paidThrough, "long")}`
              : "Fully paid"}
        </p>
      </div>
    </Card>
  )
}

function PaymentPanel({
  member,
  source,
  today,
  onCancel,
  onRecorded,
}: {
  member: PayMember
  source: "QR" | "MANUAL"
  today: string
  onCancel: () => void
  onRecorded: (done: Done) => void
}) {
  const suggested = member.balance > 0 ? member.unpaid[0]!.owed : member.monthlyDue
  const [amount, setAmount] = useState(String(suggested / 100))
  const [method, setMethod] = useState<PaymentMethodValue>("CASH")
  const [paidOn, setPaidOn] = useState(today)
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [repeat, setRepeat] = useState<string | null>(null)
  const record = useAction(recordPayment)
  const amountRef = useRef<HTMLInputElement>(null)

  const quick = [
    { label: "1 month", value: member.monthlyDue },
    { label: "2 months", value: member.monthlyDue * 2 },
    { label: "3 months", value: member.monthlyDue * 3 },
    ...(member.balance > 0 ? [{ label: "Full balance", value: member.balance }] : []),
  ].filter((q, i, all) => q.value > 0 && all.findIndex((x) => x.value === q.value) === i)

  const value = Number(amount)
  const valid = Number.isFinite(value) && value > 0

  async function submit(confirmRepeat = false) {
    const res = await record.executeAsync({
      memberId: member.id,
      amount: value,
      method,
      paidOn,
      reference,
      notes,
      source,
      confirmRepeat,
    })
    if (res?.data?.status === "recorded") onRecorded({ member: res.data.member, amount: res.data.amount })
    else if (res?.data?.status === "repeat") {
      beep("warn")
      setRepeat(res.data.message)
    }
  }

  return (
    <Card className="gap-5 px-5">
      <div className="flex items-start gap-4">
        <Avatar member={member} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold">{member.name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {member.trackingNumber} · {member.blockLot}
            {member.position !== "Member" && ` · ${member.position}`}
          </p>
          {!member.isActive && <p className="mt-1 text-xs font-semibold text-destructive">Inactive member</p>}
        </div>
        <Button variant="ghost" size="icon" aria-label="Cancel" onClick={onCancel}>
          <X />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={cn("rounded-xl px-3 py-2.5", member.balance > 0 ? "bg-destructive/10" : "bg-success/10")}>
          <p className={cn("text-xl font-bold tabular-nums", member.balance > 0 ? "text-destructive" : "text-success")}>
            {member.balance > 0
              ? formatPeso(member.balance)
              : member.credit > 0
                ? `+${formatPeso(member.credit)}`
                : "₱0"}
          </p>
          <p className="text-xs text-muted-foreground">
            {member.balance > 0 ? "Balance due" : member.credit > 0 ? "Advance credit" : "No balance"}
          </p>
        </div>
        <div className="rounded-xl bg-muted/60 px-3 py-2.5">
          <p className="text-xl font-bold">{member.paidThrough ? formatMonth(member.paidThrough) : "—"}</p>
          <p className="text-xs text-muted-foreground">Paid through</p>
        </div>
      </div>

      {member.unpaid.length > 0 && (
        <div className="grid gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Unpaid months{member.overdueMonths > 0 && ` · ${member.overdueMonths} overdue`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {member.unpaid.slice(0, 12).map((u) => (
              <span key={u.month} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                {u.label} · {formatPeso(u.owed)}
              </span>
            ))}
            {member.unpaid.length > 12 && (
              <span className="px-1 py-1 text-xs text-muted-foreground">+{member.unpaid.length - 12} more</span>
            )}
          </div>
        </div>
      )}

      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) void submit()
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="pay-amount">Amount received (₱)</Label>
          <Input
            id="pay-amount"
            ref={amountRef}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            className="h-12 text-xl font-bold tabular-nums"
            autoComplete="off"
          />
          <div className="flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <Button
                key={q.label}
                type="button"
                size="sm"
                variant={Math.round(value * 100) === q.value ? "secondary" : "outline"}
                onClick={() => setAmount(String(q.value / 100))}
              >
                {q.label} · {formatPeso(q.value)}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Method</Label>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:grid-cols-4">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={method === m.value}
                onClick={() => setMethod(m.value)}
                className={cn(
                  "h-9 rounded-lg text-sm font-semibold text-muted-foreground",
                  method === m.value && "bg-card text-foreground shadow-card"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="pay-date">Date paid</Label>
            <Input id="pay-date" type="date" value={paidOn} max={today} onChange={(e) => setPaidOn(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pay-ref">Reference no. (optional)</Label>
            <Input
              id="pay-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={method === "CASH" ? "" : "e.g. GCash ref no."}
              maxLength={60}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pay-notes">Notes (optional)</Label>
          <Input id="pay-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} />
        </div>

        {repeat && (
          <div className="grid gap-3 rounded-xl border-2 border-warning bg-warning/10 p-3 text-sm">
            <p className="flex gap-2 font-medium">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" /> {repeat}
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={record.isPending} onClick={() => submit(true)}>
                Yes, record another
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
                No, cancel
              </Button>
            </div>
          </div>
        )}
        {record.result.serverError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {record.result.serverError}
          </p>
        )}

        {!repeat && (
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="flex-1" disabled={!valid || record.isPending}>
              {record.isPending ? <Loader2 className="animate-spin" /> : <Check />}
              Record {valid ? formatPeso(Math.round(value * 100)) : "payment"}
            </Button>
          </div>
        )}
      </form>
    </Card>
  )
}

type Hit = { id: string; name: string; trackingNumber: string; blockLot: string; thumbUrl: string | null }

function ManualSearch({ onPick, disabled }: { onPick: (id: string) => void; disabled: boolean }) {
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<Hit[]>([])
  const search = useAction(searchMembersForPayment, { onSuccess: ({ data }) => data && setHits(data.members) })
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])
  useEffect(() => () => clearTimeout(timer.current), [])

  function onChange(value: string) {
    setQ(value)
    clearTimeout(timer.current)
    if (!value.trim()) {
      setHits([])
      return
    }
    timer.current = setTimeout(() => search.execute({ q: value }), 250)
  }

  return (
    <Card className="gap-3 px-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tracking no. (e.g. 2026-0012) or name"
          className="h-12 pl-9 text-base"
          inputMode="search"
          aria-label="Find member"
        />
      </div>
      {q.trim() && !search.isPending && hits.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">No active member matches “{q}”.</p>
      )}
      <ul className="grid gap-1">
        {hits.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(m.id)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none hover:bg-muted focus-visible:bg-muted disabled:opacity-60"
            >
              <Avatar member={m} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{m.name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {m.trackingNumber} · {m.blockLot}
                </span>
              </span>
              <span className="text-sm font-semibold text-muted-foreground">Select</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
