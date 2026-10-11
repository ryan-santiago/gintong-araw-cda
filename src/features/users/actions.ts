"use server"

import { randomInt } from "node:crypto"

import type { Prisma } from "@/generated/prisma/client"
import { approveUserSchema, setUserGroupsSchema, setUserStatusSchema, userIdSchema } from "@/features/users/schema"
import { writeAudit } from "@/lib/audit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { SUPER_ADMIN_GROUP } from "@/lib/permissions"
import { ActionError, outranks, type Viewer } from "@/lib/rbac"
import { actionClient } from "@/lib/safe-action"

type Tx = Prisma.TransactionClient

async function loadTarget(tx: Tx, userId: string) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    include: { groups: { include: { group: true } } },
  })
  if (!user) throw new ActionError("That user no longer exists.")
  const groups = user.groups.map((g) => g.group)
  const rank = groups.length ? Math.min(...groups.map((g) => g.rank)) : Number.POSITIVE_INFINITY
  return { user, groups, rank }
}

function assertCanManage(viewer: Viewer, target: { user: { id: string }; rank: number }) {
  if (target.user.id === viewer.id) throw new ActionError("You can't change your own account here.")
  if (!outranks(viewer, target.rank)) {
    throw new ActionError("You can only manage users with a lower rank than yours.")
  }
}

/** Throws if the change would leave no active Super Admin. */
async function assertSuperAdminRemains(tx: Tx, excludingUserId: string) {
  const remaining = await tx.user.count({
    where: {
      id: { not: excludingUserId },
      status: "ACTIVE",
      groups: { some: { group: { name: SUPER_ADMIN_GROUP, isSystem: true } } },
    },
  })
  if (remaining === 0) throw new ActionError("There must always be at least one active Super Admin.")
}

async function assertAssignable(tx: Tx, viewer: Viewer, groupIds: string[]) {
  const groups = await tx.userGroup.findMany({ where: { id: { in: groupIds } } })
  if (groups.length !== groupIds.length) throw new ActionError("One of the selected groups no longer exists.")
  const blocked = groups.find((g) => !outranks(viewer, g.rank))
  if (blocked) throw new ActionError(`You can't assign the "${blocked.name}" group.`)
  return groups
}

export const approveUser = actionClient
  .metadata({ name: "approveUser", permission: "user.approve" })
  .inputSchema(approveUserSchema)
  .action(async ({ parsedInput: { userId, groupIds }, ctx: { viewer } }) => {
    await db.$transaction(async (tx) => {
      const target = await loadTarget(tx, userId)
      if (target.user.status !== "PENDING") throw new ActionError("This account is no longer pending.")
      const groups = await assertAssignable(tx, viewer, groupIds)

      await tx.user.update({
        where: { id: userId },
        data: { status: "ACTIVE", approvedAt: new Date(), approvedById: viewer.id },
      })
      await tx.userGroupMember.createMany({
        data: groupIds.map((groupId) => ({ userId, groupId, assignedBy: viewer.id })),
        skipDuplicates: true,
      })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "user.approve",
        entityType: "User",
        entityId: userId,
        before: { status: "PENDING" },
        after: { status: "ACTIVE", groups: groups.map((g) => g.name) },
      })
    })
    return { ok: true }
  })

export const rejectUser = actionClient
  .metadata({ name: "rejectUser", permission: "user.approve" })
  .inputSchema(userIdSchema)
  .action(async ({ parsedInput: { userId }, ctx: { viewer } }) => {
    await db.$transaction(async (tx) => {
      const target = await loadTarget(tx, userId)
      if (target.user.status !== "PENDING") throw new ActionError("Only pending registrations can be rejected.")
      await tx.user.delete({ where: { id: userId } })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "user.reject",
        entityType: "User",
        entityId: userId,
        before: { name: target.user.name, email: target.user.email, status: "PENDING" },
      })
    })
    return { ok: true }
  })

export const setUserStatus = actionClient
  .metadata({ name: "setUserStatus", permission: "user.manage" })
  .inputSchema(setUserStatusSchema)
  .action(async ({ parsedInput: { userId, status }, ctx: { viewer } }) => {
    await db.$transaction(async (tx) => {
      const target = await loadTarget(tx, userId)
      assertCanManage(viewer, target)
      if (target.user.status === "PENDING") throw new ActionError("Approve or reject pending accounts instead.")
      if (target.user.status === status) return
      if (status === "SUSPENDED") await assertSuperAdminRemains(tx, userId)

      await tx.user.update({ where: { id: userId }, data: { status } })
      if (status === "SUSPENDED") await tx.session.deleteMany({ where: { userId } })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: status === "SUSPENDED" ? "user.suspend" : "user.reactivate",
        entityType: "User",
        entityId: userId,
        before: { status: target.user.status },
        after: { status },
      })
    })
    return { ok: true }
  })

export const setUserGroups = actionClient
  .metadata({ name: "setUserGroups", permission: "user.manage" })
  .inputSchema(setUserGroupsSchema)
  .action(async ({ parsedInput: { userId, groupIds }, ctx: { viewer } }) => {
    await db.$transaction(async (tx) => {
      const target = await loadTarget(tx, userId)
      assertCanManage(viewer, target)

      const current = new Set(target.groups.map((g) => g.id))
      const next = new Set(groupIds)
      const added = groupIds.filter((id) => !current.has(id))
      const removed = target.groups.filter((g) => !next.has(g.id))

      await assertAssignable(tx, viewer, added)
      const blocked = removed.find((g) => !outranks(viewer, g.rank))
      if (blocked) throw new ActionError(`You can't remove the "${blocked.name}" group.`)
      if (removed.some((g) => g.isSystem && g.name === SUPER_ADMIN_GROUP)) await assertSuperAdminRemains(tx, userId)

      if (removed.length) {
        await tx.userGroupMember.deleteMany({ where: { userId, groupId: { in: removed.map((g) => g.id) } } })
      }
      if (added.length) {
        await tx.userGroupMember.createMany({
          data: added.map((groupId) => ({ userId, groupId, assignedBy: viewer.id })),
        })
      }
      if (!added.length && !removed.length) return

      const after = await tx.userGroup.findMany({ where: { id: { in: groupIds } }, select: { name: true } })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "user.groups_update",
        entityType: "User",
        entityId: userId,
        before: { groups: target.groups.map((g) => g.name) },
        after: { groups: after.map((g) => g.name) },
      })
    })
    return { ok: true }
  })

// Readable temporary password, e.g. "Araw-7KQ3-M9PZ". No ambiguous characters.
function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const block = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("")
  return `Araw-${block()}-${block()}`
}

export const resetUserPassword = actionClient
  .metadata({ name: "resetUserPassword", permission: "user.manage" })
  .inputSchema(userIdSchema)
  .action(async ({ parsedInput: { userId }, ctx: { viewer } }) => {
    const password = temporaryPassword()
    const hash = await (await auth.$context).password.hash(password)

    await db.$transaction(async (tx) => {
      const target = await loadTarget(tx, userId)
      assertCanManage(viewer, target)

      const updated = await tx.account.updateMany({
        where: { userId, providerId: "credential" },
        data: { password: hash },
      })
      if (updated.count === 0) {
        await tx.account.create({
          data: { id: crypto.randomUUID(), accountId: userId, providerId: "credential", userId, password: hash },
        })
      }
      await tx.user.update({ where: { id: userId }, data: { mustChangePassword: true } })
      await tx.session.deleteMany({ where: { userId } })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "user.reset_password",
        entityType: "User",
        entityId: userId,
      })
    })
    // Shown once to the admin; never stored or logged in plain text.
    return { temporaryPassword: password }
  })
