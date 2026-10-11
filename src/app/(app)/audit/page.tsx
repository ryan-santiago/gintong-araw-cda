import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AuditFiltersBar } from "@/features/audit/components/audit-filters"
import { AuditTable, type AuditRow } from "@/features/audit/components/audit-table"
import { auditActionLabel } from "@/features/audit/labels"
import { AUDIT_PAGE_SIZE, auditFilterOptions, listAuditLogs, parseAuditFilters } from "@/features/audit/queries"
import { formatManila } from "@/lib/dates"
import { can, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Audit Trail" }

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  const viewer = await requireViewer()
  if (!can(viewer, "audit.view")) return <NoAccess what="the audit trail" />

  const params = await searchParams
  const filters = parseAuditFilters(params)
  const [{ total, entries }, options] = await Promise.all([listAuditLogs(filters), auditFilterOptions()])

  const rows: AuditRow[] = entries.map((e) => ({
    id: e.id,
    time: formatManila(e.createdAt, "MMM d, yyyy h:mm:ss a"),
    action: e.action,
    actionLabel: auditActionLabel(e.action),
    actor: e.actor ? { name: e.actor.name, email: e.actor.email } : null,
    entityType: e.entityType,
    entityId: e.entityId,
    before: e.before ?? null,
    after: e.after ?? null,
    metadata: e.metadata ?? null,
    ipAddress: e.ipAddress,
    userAgent: e.userAgent,
  }))

  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE))
  const pageHref = (page: number) => {
    const sp = new URLSearchParams()
    for (const [key, value] of Object.entries(params))
      if (typeof value === "string" && key !== "page") sp.set(key, value)
    if (page > 1) sp.set("page", String(page))
    const s = sp.toString()
    return s ? `/audit?${s}` : "/audit"
  }
  const first = total === 0 ? 0 : (filters.page - 1) * AUDIT_PAGE_SIZE + 1
  const last = Math.min(filters.page * AUDIT_PAGE_SIZE, total)

  return (
    <>
      <PageHeader title="Audit Trail" description="Every change, who made it and when. Times are in Philippine time." />

      <AuditFiltersBar
        actions={options.actions.map((a) => ({ value: a, label: auditActionLabel(a) }))}
        entities={options.entities}
        actors={options.actors}
      />

      <Card className="gap-0 py-0">
        <AuditTable rows={rows} />
        <div className="flex items-center justify-between gap-3 border-t px-5 py-3 text-sm">
          <span className="text-muted-foreground tabular-nums">
            {first}–{last} of {total}
          </span>
          <div className="flex gap-2">
            <Button asChild={filters.page > 1} variant="outline" size="sm" disabled={filters.page <= 1}>
              {filters.page > 1 ? (
                <Link href={pageHref(filters.page - 1)}>
                  <ChevronLeft /> Newer
                </Link>
              ) : (
                <span>
                  <ChevronLeft /> Newer
                </span>
              )}
            </Button>
            <Button asChild={filters.page < pages} variant="outline" size="sm" disabled={filters.page >= pages}>
              {filters.page < pages ? (
                <Link href={pageHref(filters.page + 1)}>
                  Older <ChevronRight />
                </Link>
              ) : (
                <span>
                  Older <ChevronRight />
                </span>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </>
  )
}
