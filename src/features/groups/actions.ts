"use server"

import { groupIdSchema, groupSchema } from "@/features/groups/schema"
import { writeAudit } from "@/lib/audit"
import { db } from "@/lib/db"
import { isPermissionKey } from "@/lib/permissions"
import { ActionError, outranks } from "@/lib/rbac"
import { actionClient } from "@/lib/safe-action"

export const saveGroup = actionClient
  .metadata({ name: "saveGroup", permission: "group.manage" })
  .inputSchema(groupSchema)
  .action(async ({ parsedInput: input, ctx: { viewer } }) => {
    if (!outranks(viewer, input.rank)) {
      throw new ActionError(`Rank must be higher than your own (${viewer.rank}). Lower numbers mean more authority.`)
    }

    const held = new Set(viewer.permissions)

    return db.$transaction(async (tx) => {
      const existing = input.id
        ? await tx.userGroup.findUnique({
            where: { id: input.id },
            include: { permissions: { include: { permission: true } } },
          })
        : null
      if (input.id && !existing) throw new ActionError("That group no longer exists.")
      if (existing?.isSystem) throw new ActionError("System groups can't be edited.")
      if (existing && !outranks(viewer, existing.rank)) {
        throw new ActionError("You can only edit groups with a lower rank than yours.")
      }

      // You can only grant permissions you hold. Permissions you don't hold that the
      // group already has are kept as they are.
      const existingKeys = existing?.permissions.map((p) => p.permission.key).filter(isPermissionKey) ?? []
      const requested = new Set(input.permissions)
      const notAllowed = [...requested].filter((k) => !held.has(k) && !existingKeys.includes(k))
      if (notAllowed.length) throw new ActionError("You can't grant permissions you don't have yourself.")
      const finalKeys = [...[...requested].filter((k) => held.has(k)), ...existingKeys.filter((k) => !held.has(k))]

      const permissionRows = await tx.permission.findMany({ where: { key: { in: finalKeys } } })
      const data = { name: input.name, description: input.description || null, rank: input.rank }

      const group = existing
        ? await tx.userGroup.update({ where: { id: existing.id }, data })
        : await tx.userGroup.create({ data })

      await tx.groupPermission.deleteMany({ where: { groupId: group.id } })
      await tx.groupPermission.createMany({
        data: permissionRows.map((p) => ({ groupId: group.id, permissionId: p.id })),
      })

      const after = { ...data, permissions: [...finalKeys].sort() }
      await writeAudit(tx, {
        actorId: viewer.id,
        action: existing ? "group.update" : "group.create",
        entityType: "UserGroup",
        entityId: group.id,
        before: existing
          ? {
              name: existing.name,
              description: existing.description,
              rank: existing.rank,
              permissions: [...existingKeys].sort(),
            }
          : undefined,
        after,
      })
      return { id: group.id }
    })
  })

export const deleteGroup = actionClient
  .metadata({ name: "deleteGroup", permission: "group.manage" })
  .inputSchema(groupIdSchema)
  .action(async ({ parsedInput: { id }, ctx: { viewer } }) => {
    await db.$transaction(async (tx) => {
      const group = await tx.userGroup.findUnique({
        where: { id },
        include: { _count: { select: { members: true } }, permissions: { include: { permission: true } } },
      })
      if (!group) throw new ActionError("That group no longer exists.")
      if (group.isSystem) throw new ActionError("System groups can't be deleted.")
      if (!outranks(viewer, group.rank))
        throw new ActionError("You can only delete groups with a lower rank than yours.")

      await tx.userGroup.delete({ where: { id } })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "group.delete",
        entityType: "UserGroup",
        entityId: id,
        before: {
          name: group.name,
          rank: group.rank,
          memberCount: group._count.members,
          permissions: group.permissions.map((p) => p.permission.key).sort(),
        },
      })
    })
    return { ok: true }
  })
