import "server-only"

import { headers } from "next/headers"

import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { db } from "@/lib/db"

type Client = PrismaClient | Prisma.TransactionClient

export type AuditEntry = {
  actorId?: string | null
  action: string
  entityType?: string
  entityId?: string
  before?: unknown
  after?: unknown
  metadata?: unknown
  /** Pass when called outside a request scope (e.g. Better Auth hooks). */
  request?: { ipAddress?: string | null; userAgent?: string | null }
}

// Values that must never be written to the audit log.
const SECRET_KEYS = new Set(["password", "token", "accessToken", "refreshToken", "idToken"])

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined
  return JSON.parse(
    JSON.stringify(value, (key, v) => (SECRET_KEYS.has(key) ? "[redacted]" : typeof v === "bigint" ? v.toString() : v))
  )
}

async function requestInfo() {
  try {
    const h = await headers()
    return {
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
      userAgent: h.get("user-agent"),
    }
  } catch {
    return { ipAddress: null, userAgent: null }
  }
}

/**
 * Append an audit entry. Call with the transaction client so the log is written
 * in the same transaction as the change it describes.
 */
export async function writeAudit(client: Client, entry: AuditEntry) {
  const info = entry.request ?? (await requestInfo())
  await client.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: toJson(entry.before),
      after: toJson(entry.after),
      metadata: toJson(entry.metadata),
      ipAddress: info.ipAddress ?? null,
      userAgent: info.userAgent ?? null,
    },
  })
}

/** Shorthand when there is no surrounding transaction. */
export function audit(entry: AuditEntry) {
  return writeAudit(db, entry)
}

/** Keep only the fields that changed, so the log shows a readable diff. */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const b: Record<string, unknown> = {}
  const a: Record<string, unknown> = {}
  for (const key of Object.keys(after)) {
    const prev = before[key]
    const next = after[key]
    const same =
      prev instanceof Date && next instanceof Date
        ? prev.getTime() === next.getTime()
        : JSON.stringify(prev) === JSON.stringify(next)
    if (!same) {
      b[key] = prev
      a[key] = next
    }
  }
  return { before: b, after: a, changed: Object.keys(a).length > 0 }
}
