import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { db } from "@/lib/db"
import { outranks, type Viewer } from "@/lib/rbac"

export const USER_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"] as const
export type UserStatusFilter = (typeof USER_STATUSES)[number]

export async function listUsers({ status, q }: { status?: UserStatusFilter; q?: string }) {
  const where: Prisma.UserWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
      : {}),
  }
  const users = await db.user.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    take: 500,
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      groups: { select: { group: { select: { id: true, name: true, rank: true } } } },
    },
  })
  return users.map((u) => {
    const groups = u.groups.map((g) => g.group).sort((a, b) => a.rank - b.rank)
    return {
      ...u,
      groups,
      rank: groups.length ? groups[0]!.rank : Number.POSITIVE_INFINITY,
    }
  })
}

export async function countUsersByStatus() {
  const rows = await db.user.groupBy({ by: ["status"], _count: { _all: true } })
  const counts = { PENDING: 0, ACTIVE: 0, SUSPENDED: 0 }
  for (const row of rows) counts[row.status] = row._count._all
  return counts
}

/** Groups the viewer may assign (strictly lower authority, or any for a Super Admin). */
export async function assignableGroups(viewer: Viewer) {
  const groups = await db.userGroup.findMany({ orderBy: { rank: "asc" }, select: { id: true, name: true, rank: true } })
  return groups.map((g) => ({ ...g, assignable: outranks(viewer, g.rank) }))
}
