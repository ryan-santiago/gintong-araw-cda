import { cn } from "@/lib/utils"

const styles = {
  PENDING: "bg-accent text-accent-foreground",
  ACTIVE: "bg-success/15 text-success",
  SUSPENDED: "bg-muted text-muted-foreground",
} as const

const labels = { PENDING: "Pending", ACTIVE: "Active", SUSPENDED: "Suspended" } as const

export function UserStatusBadge({ status }: { status: keyof typeof styles }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[status]
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  )
}
