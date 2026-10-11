import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { db } from "@/lib/db"
import { manilaDayRange } from "@/lib/dates"

export const AUDIT_PAGE_SIZE = 50

export type AuditFilters = {
  action?: string
  actorId?: string
  entityType?: string
  from?: string // yyyy-MM-dd (Manila)
  to?: string
  page: number
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

export function parseAuditFilters(params: Record<string, string | string[] | undefined>): AuditFilters {
  const str = (key: string) => (typeof params[key] === "string" && params[key] ? (params[key] as string) : undefined)
  const page = Number.parseInt(str("page") ?? "1", 10)
  return {
    action: str("action"),
    actorId: str("actor"),
    entityType: str("entity"),
    from: str("from")?.match(DAY) ? str("from") : undefined,
    to: str("to")?.match(DAY) ? str("to") : undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export async function listAuditLogs(filters: AuditFilters) {
  const createdAt: Prisma.DateTimeFilter = {}
  if (filters.from) createdAt.gte = manilaDayRange(filters.from).start
  if (filters.to) createdAt.lt = manilaDayRange(filters.to).end

  const where: Prisma.AuditLogWhereInput = {
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.actorId ? { actorId: filters.actorId } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.from || filters.to ? { createdAt } : {}),
  }

  const [total, entries] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
      include: { actor: { select: { name: true, email: true } } },
    }),
  ])
  return { total, entries }
}

/** Options for the filter dropdowns. */
export async function auditFilterOptions() {
  const [actions, entities, actors] = await Promise.all([
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    db.auditLog.findMany({
      distinct: ["entityType"],
      where: { entityType: { not: null } },
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ])
  return {
    actions: actions.map((a) => a.action),
    entities: entities.map((e) => e.entityType!).filter(Boolean),
    actors,
  }
}
