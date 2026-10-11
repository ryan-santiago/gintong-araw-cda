import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Point = { label: string; present: number; live?: boolean }

export function AttendanceTrendCard({ total, points }: { total: number; points: Point[] }) {
  const best = points.reduce((a, b) => (b.present > a.present ? b : a))

  return (
    <Card className="gap-0 lg:col-span-8">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5">
        <div>
          <p className="text-[38px] leading-none font-bold tracking-tight tabular-nums">{total}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">Active member households</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold">Last 8 meetings</span>
          <div className="flex gap-3.5 text-xs text-muted-foreground">
            <Legend className="bg-primary" label="Present" />
            <Legend className="bg-muted" label="Absent" />
            <Legend className="bg-secondary" label="Today" />
          </div>
        </div>
      </div>

      <div
        role="img"
        aria-label={`Attendance over the last ${points.length} meetings. Best: ${best.label} with ${best.present} present.`}
        className="mt-6 flex h-52 items-end gap-2 px-5 sm:gap-3.5"
      >
        {points.map((point) => {
          const pct = Math.round((point.present / total) * 100)
          return (
            <div key={point.label} className="group flex h-full flex-1 flex-col items-center gap-2">
              <div className="relative flex w-full max-w-14 flex-1 items-end overflow-hidden rounded-xl bg-muted">
                <div
                  className={cn(
                    "w-full rounded-xl transition-[filter] group-hover:brightness-105",
                    point.live ? "bg-secondary" : "bg-primary",
                    point === best &&
                      "bg-[repeating-linear-gradient(135deg,var(--primary)_0_8px,color-mix(in_srgb,var(--primary)_78%,white)_8px_16px)]"
                  )}
                  style={{ height: `${pct}%` }}
                />
                <span className="pointer-events-none absolute inset-x-0 top-2 text-center text-[11px] font-semibold tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
                  {pct}%
                </span>
              </div>
              <span className="text-[11px] whitespace-nowrap text-muted-foreground">{point.label}</span>
            </div>
          )
        })}
      </div>
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
