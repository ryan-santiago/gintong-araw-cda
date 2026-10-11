import "server-only"

import { db } from "@/lib/db"
import { isPermissionKey, type PermissionKey } from "@/lib/permissions"

export async function listGroups() {
  const groups = await db.userGroup.findMany({
    orderBy: [{ rank: "asc" }, { name: "asc" }],
    include: { _count: { select: { members: true, permissions: true } } },
  })
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    rank: g.rank,
    isSystem: g.isSystem,
    memberCount: g._count.members,
    permissionCount: g._count.permissions,
  }))
}

export async function getGroup(id: string) {
  const group = await db.userGroup.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: { select: { key: true } } } },
      _count: { select: { members: true } },
    },
  })
  if (!group) return null
  return {
    id: group.id,
    name: group.name,
    description: group.description ?? "",
    rank: group.rank,
    isSystem: group.isSystem,
    memberCount: group._count.members,
    permissions: group.permissions.map((p) => p.permission.key).filter(isPermissionKey) as PermissionKey[],
  }
}
