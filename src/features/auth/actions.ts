"use server"

import { APIError } from "better-auth/api"
import { headers } from "next/headers"

import { changePasswordSchema } from "@/features/auth/schema"
import { writeAudit } from "@/lib/audit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ActionError } from "@/lib/rbac"
import { actionClient } from "@/lib/safe-action"

export const changePasswordAction = actionClient
  .metadata({ name: "changePassword" })
  .inputSchema(changePasswordSchema)
  .action(async ({ parsedInput, ctx: { viewer } }) => {
    try {
      await auth.api.changePassword({
        body: {
          currentPassword: parsedInput.currentPassword,
          newPassword: parsedInput.newPassword,
          revokeOtherSessions: true,
        },
        headers: await headers(),
      })
    } catch (error) {
      if (error instanceof APIError && error.body?.code === "INVALID_PASSWORD") {
        throw new ActionError("Your current password is incorrect.")
      }
      throw error
    }

    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: viewer.id }, data: { mustChangePassword: false } })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "user.change_password",
        entityType: "User",
        entityId: viewer.id,
        metadata: { wasTemporary: viewer.mustChangePassword },
      })
    })
    return { ok: true }
  })
