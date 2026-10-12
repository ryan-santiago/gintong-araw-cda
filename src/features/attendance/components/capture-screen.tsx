"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, CircleAlert, Keyboard, Loader2, QrCode, Search, TriangleAlert, UserRound } from "lucide-react"
import { useAction } from "next-safe-action/hooks"

import { QrCamera, beep } from "@/components/shared/qr-camera"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getCaptureStatus,
  recordAttendanceByCard,
  recordAttendanceManual,
  searchMembersForCapture,
  type CaptureResult,
} from "@/features/attendance/actions"
import { cn } from "@/lib/utils"

const time = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" })
const fmt = (iso: string) => time.format(new Date(iso))

type Status = {
  status: string
  present: number
  active: number
  recent: { id: string; name: string; trackingNumber: string; method: "QR" | "MANUAL"; checkedInAt: string }[]
}

export function CaptureScreen({
  meeting,
  openMeetings,
  initialStatus,
}: {
  meeting: { id: string; title: string; dateLabel: string }
  openMeetings: { id: string; label: string }[]
  initialStatus: Status
}) {
  const router = useRouter()
  const [mode, setMode] = useState<"scan" | "manual">("scan")
  const [result, setResult] = useState<CaptureResult | null>(null)
  const [status, setStatus] = useState<Status>(initialStatus)

  const statusAction = useAction(getCaptureStatus, {
    onSuccess: ({ data }) => data && setStatus(data as Status),
  })
  const refreshStatus = useCallback(() => statusAction.execute({ meetingId: meeting.id }), [statusAction, meeting.id])

  // Keep the count and recent list in sync with other phones scanning the same meeting.
  useEffect(() => {
    const t = setInterval(refreshStatus, 5000)
    return () => clearInterval(t)
  }, [refreshStatus])

  const byCard = useAction(recordAttendanceByCard)
  const manual = useAction(recordAttendanceManual)

  function show(r: CaptureResult) {
    setResult(r)
    beep(r.status === "recorded" ? "ok" : r.status === "duplicate" ? "warn" : "error")
    if ("present" in r) setStatus((s) => ({ ...s, present: r.present }))
    refreshStatus()
  }

  async function onScan(text: string) {
    const res = await byCard.executeAsync({ meetingId: meeting.id, text })
    if (res?.data) show(res.data)
    else show({ status: "invalid", message: res?.serverError ?? "Couldn't record attendance. Try again." })
  }

  async function checkIn(memberId: string) {
    const res = await manual.executeAsync({ meetingId: meeting.id, memberId })
    if (res?.data) show(res.data)
    else show({ status: "invalid", message: res?.serverError ?? "Couldn't record attendance. Try again." })
  }

  const pct = status.active ? Math.round((status.present / status.active) * 100) : 0
  const closed = status.status !== "OPEN"

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-4">
        {/* Meeting + live count */}
        <Card className="gap-3 px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Capturing attendance for</p>
              {openMeetings.length > 1 ? (
                <Select value={meeting.id} onValueChange={(id) => router.push(`/attendance/capture?meeting=${id}`)}>
                  <SelectTrigger className="mt-1 h-9 max-w-full font-semibold" aria-label="Meeting">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {openMeetings.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="truncate text-lg font-bold">
                  {meeting.title} · {meeting.dateLabel}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl leading-none font-extrabold tabular-nums">
                {status.present}
                <span className="text-base font-semibold text-muted-foreground"> / {status.active}</span>
              </p>
              <p className="text-xs text-muted-foreground">present · {pct}%</p>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          {closed && (
            <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <CircleAlert className="size-4" /> This meeting is closed. Reopen it on the{" "}
              <Link href={`/meetings/${meeting.id}`} className="font-semibold underline">
                meeting page
              </Link>
              .
            </p>
          )}
        </Card>

        {/* Mode switch */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Capture mode">
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
            <QrCamera onCode={onScan} paused={closed} onManual={() => setMode("manual")}>
              {(result || byCard.isPending) && <ResultCard result={result} pending={byCard.isPending} overlay />}
            </QrCamera>
          </Card>
        ) : (
          <ManualSearch meetingId={meeting.id} onPick={checkIn} disabled={closed || manual.isPending} />
        )}

        {mode === "manual" && <ResultCard result={result} pending={manual.isPending} />}
      </div>

      {/* Recent check-ins */}
      <Card className="gap-0 self-start py-0">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <p className="font-semibold">Recent check-ins</p>
          {statusAction.isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        {status.recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No one yet. Scan the first ID.</p>
        ) : (
          <ul className="divide-y">
            {status.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{r.trackingNumber}</span>
                </span>
                <span className="text-right text-xs">
                  <span className="block font-semibold tabular-nums">{fmt(r.checkedInAt)}</span>
                  <span className="text-muted-foreground">{r.method === "QR" ? "QR" : "Manual"}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t px-5 py-3">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href={`/meetings/${meeting.id}`}>View full list</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}

function ResultCard({
  result,
  pending,
  overlay,
}: {
  result: CaptureResult | null
  pending: boolean
  overlay?: boolean
}) {
  if (pending && !result) {
    return (
      <Card className="flex-row items-center gap-3 px-5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking…
      </Card>
    )
  }
  if (!result) {
    return (
      <Card className="flex-row items-center gap-3 border border-dashed px-5 text-sm text-muted-foreground shadow-none">
        <QrCode className="size-5" /> Point the camera at the QR code on a member&apos;s ID.
      </Card>
    )
  }

  const tone =
    result.status === "recorded"
      ? {
          ring: "border-success",
          tint: "bg-success/10",
          icon: <Check className="size-5" />,
          iconBg: "bg-success text-white",
        }
      : result.status === "duplicate"
        ? {
            ring: "border-warning",
            tint: "bg-warning/10",
            icon: <TriangleAlert className="size-5" />,
            iconBg: "bg-warning text-white",
          }
        : {
            ring: "border-destructive",
            tint: "bg-destructive/10",
            icon: <CircleAlert className="size-5" />,
            iconBg: "bg-destructive text-white",
          }

  const title =
    "message" in result
      ? result.message
      : result.status === "recorded"
        ? "Checked in"
        : `Already checked in at ${fmt(result.checkedInAt)}`

  return (
    <Card
      key={`${result.status}-${"checkedInAt" in result ? result.checkedInAt : result.message}-${result.member?.id ?? ""}`}
      className={cn(
        "animate-in flex-row items-center gap-4 border-2 px-5 duration-200 zoom-in-95 fade-in",
        tone.ring,
        overlay ? "bg-card/95 py-3 shadow-lg backdrop-blur" : tone.tint,
        result.status !== "recorded" && result.status !== "duplicate" && "animate-[shake_0.3s_ease-in-out]"
      )}
      aria-live="assertive"
    >
      {result.member ? (
        <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-muted ring-2 ring-card">
          {result.member.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed R2 thumbnail
            <img src={result.member.thumbUrl} alt="" className="size-full object-cover" />
          ) : (
            <UserRound className="m-auto mt-4 size-8 text-muted-foreground" />
          )}
          <span className={cn("absolute right-0 bottom-0 grid size-6 place-items-center rounded-tl-lg", tone.iconBg)}>
            {tone.icon}
          </span>
        </span>
      ) : (
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", tone.iconBg)}>{tone.icon}</span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {result.member && (
          <>
            <p className="truncate text-lg font-extrabold">{result.member.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {result.member.trackingNumber} · {result.member.blockLot}
              {result.member.position !== "Member" && ` · ${result.member.position}`}
            </p>
          </>
        )}
        {"checkedInAt" in result && result.status === "recorded" && (
          <p className="text-xs text-muted-foreground">Time in {fmt(result.checkedInAt)}</p>
        )}
      </div>
    </Card>
  )
}

type SearchHit = {
  id: string
  name: string
  trackingNumber: string
  blockLot: string
  thumbUrl: string | null
  presentAt: string | null
}

function ManualSearch({
  meetingId,
  onPick,
  disabled,
}: {
  meetingId: string
  onPick: (memberId: string) => Promise<void>
  disabled: boolean
}) {
  const [q, setQ] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const search = useAction(searchMembersForCapture, { onSuccess: ({ data }) => data && setHits(data.members) })
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
    timer.current = setTimeout(() => search.execute({ meetingId, q: value }), 250)
  }

  async function pick(id: string) {
    await onPick(id)
    search.execute({ meetingId, q })
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
          <li key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted">
            <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-muted">
              {m.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed R2 thumbnail
                <img src={m.thumbUrl} alt="" className="size-full object-cover" />
              ) : (
                <UserRound className="m-auto mt-2.5 size-6 text-muted-foreground" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{m.name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {m.trackingNumber} · {m.blockLot}
              </span>
            </span>
            {m.presentAt ? (
              <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                Present {fmt(m.presentAt)}
              </span>
            ) : (
              <Button size="sm" disabled={disabled} onClick={() => pick(m.id)}>
                <Check /> Check in
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
