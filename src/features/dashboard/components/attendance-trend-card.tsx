import Link from "next/link"
import { BarChart3 } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Point = { id: string; label: string; present: number; live?: boolean }

export function AttendanceTrendCard({ total, points }: { total: number; points: Point[] }) {
  const best = points.length ? points.reduce((a, b) => (b.present > a.present ? b : a)) : null
  const hasLive = points.some((p) => p.live)

  return (
    <Card className="gap-0 lg:col-span-8">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5">
        <div>
          <p className="text-[38px] leading-none font-bold tracking-tight tabular-nums">{total}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">Active member households</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold">
            Last {points.length || 8} meetings
          </span>
          <div className="flex gap-3.5 text-xs text-muted-foreground">
            <Legend className="bg-primary" label="Present" />
            <Legend className="bg-muted" label="Absent" />
            {hasLive && <Legend className="bg-secondary" label="In progress" />}
          </div>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="mx-5 mt-6 grid h-52 place-items-center content-center gap-2 rounded-2xl border border-dashed text-center">
          <BarChart3 className="size-7 text-muted-foreground" />
          <p className="text-sm font-semibold">No meetings held yet</p>
          <p className="text-xs text-muted-foreground">Attendance for each meeting will show here.</p>
        </div>
      ) : (
        <div
          role="img"
          aria-label={`Attendance over the last ${points.length} meetings.${best ? ` Best: ${best.label} with ${best.present} present.` : ""}`}
          className="mt-6 flex h-52 items-end gap-2 px-5 sm:gap-3.5"
        >
          {points.map((point) => {
            const pct = total ? Math.min(100, Math.round((point.present / total) * 100)) : 0
            return (
              <Link
                key={point.id}
                href={`/meetings/${point.id}`}
                className="group flex h-full flex-1 flex-col items-center gap-2 outline-none"
                title={`${point.label}: ${point.present} present (${pct}%)`}
              >
                <div className="relative flex w-full max-w-14 flex-1 items-end overflow-hidden rounded-xl bg-muted">
                  <div
                    className={cn(
                      "w-full rounded-xl transition-[filter] group-hover:brightness-105",
                      point.live ? "bg-secondary" : "bg-primary",
                      !point.live &&
                        point === best &&
                        "bg-[repeating-linear-gradient(135deg,var(--primary)_0_8px,color-mix(in_srgb,var(--primary)_78%,white)_8px_16px)]"
                    )}
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                  <span className="pointer-events-none absolute inset-x-0 top-2 text-center text-[11px] font-semibold tabular-nums opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    {pct}%
                  </span>
                </div>
                <span className="text-[11px] whitespace-nowrap text-muted-foreground">{point.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className={cn("inline-block size-2.5 rounded-[3px]", className)} />
      {label}
    </span>
  )
}
