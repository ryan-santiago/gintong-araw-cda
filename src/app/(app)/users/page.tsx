import type { Metadata } from "next"
import Link from "next/link"
import { Search } from "lucide-react"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { UsersTable, type UserRow } from "@/features/users/components/users-table"
import {
  assignableGroups,
  countUsersByStatus,
  listUsers,
  USER_STATUSES,
  type UserStatusFilter,
} from "@/features/users/queries"
import { formatManila } from "@/lib/dates"
import { can, outranks, requireViewer } from "@/lib/rbac"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Users" }

const TABS: { label: string; value?: UserStatusFilter }[] = [
  { label: "All" },
  { label: "Pending", value: "PENDING" },
  { label: "Active", value: "ACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
]

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const viewer = await requireViewer()
  if (!can(viewer, "user.view")) return <NoAccess what="users" />

  const params = await searchParams
  const rawStatus = typeof params.status === "string" ? params.status : undefined
  const status = USER_STATUSES.find((s) => s === rawStatus)
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : ""

  const [users, counts, groups] = await Promise.all([
    listUsers({ status, q: q || undefined }),
    countUsersByStatus(),
    assignableGroups(viewer),
  ])

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    status: u.status,
    groups: u.groups.map((g) => ({ id: g.id, name: g.name })),
    createdAt: formatManila(u.createdAt, "MMM d, yyyy"),
    lastLoginAt: u.lastLoginAt ? formatManila(u.lastLoginAt, "MMM d, yyyy h:mm a") : null,
    isSelf: u.id === viewer.id,
    manageable: u.id !== viewer.id && outranks(viewer, u.rank),
  }))

  const total = counts.PENDING + counts.ACTIVE + counts.SUSPENDED
  const hrefFor = (value?: string) => {
    const sp = new URLSearchParams()
    if (value) sp.set("status", value)
    if (q) sp.set("q", q)
    const s = sp.toString()
    return s ? `/users?${s}` : "/users"
  }

  return (
    <>
      <PageHeader title="Users" description="Accounts for officers and staff. Members don't need accounts." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Filter by status" className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
          {TABS.map((tab) => {
            const active = tab.value === status
            const count = tab.value ? counts[tab.value] : total
            return (
              <Link
                key={tab.label}
                href={hrefFor(tab.value)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  active && "bg-card text-foreground shadow-card"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    tab.value === "PENDING" && count > 0 ? "bg-primary text-primary-foreground" : "bg-background"
                  )}
                >
                  {count}
                </span>
              </Link>
            )
          })}
        </nav>

        <form action="/users" className="relative w-full sm:max-w-xs">
          {status && <input type="hidden" name="status" value={status} />}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search name or email"
            className="pl-9"
            aria-label="Search users"
          />
        </form>
      </div>

      <Card className="py-0">
        <UsersTable
          rows={rows}
          groups={groups}
          canApprove={can(viewer, "user.approve")}
          canManage={can(viewer, "user.manage")}
        />
      </Card>
    </>
  )
}
