import { cn } from "@/lib/utils"

const styles = {
  OPEN: "bg-success/15 text-success",
  SCHEDULED: "bg-accent text-accent-foreground",
  CLOSED: "bg-muted text-muted-foreground",
} as const

const labels = { OPEN: "Open", SCHEDULED: "Scheduled", CLOSED: "Closed" } as const

export function MeetingStatusBadge({ status, className }: { status: keyof typeof styles; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        styles[status],
        className
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full bg-current", status === "OPEN" && "animate-pulse")} />
      {labels[status]}
    </span>
  )
}
