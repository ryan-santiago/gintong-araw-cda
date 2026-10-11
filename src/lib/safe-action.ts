import "server-only"

import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE } from "next-safe-action"
import { z } from "zod"

import { Prisma } from "@/generated/prisma/client"
import { isPermissionKey, type PermissionKey } from "@/lib/permissions"
import { ActionError, getViewer, requirePermission } from "@/lib/rbac"

const baseClient = createSafeActionClient({
  defineMetadataSchema: () =>
    z.object({
      name: z.string(),
      permission: z.string().refine(isPermissionKey).optional(),
    }),
  handleServerError(error) {
    if (error instanceof ActionError) return error.message
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "That value is already in use."
    }
    console.error(error)
    return DEFAULT_SERVER_ERROR_MESSAGE
  },
})

/**
 * Every mutation goes through this client: it requires an active session and,
 * when `metadata.permission` is set, that permission. `ctx.viewer` is the caller.
 */
export const actionClient = baseClient.use(async ({ next, metadata }) => {
  const viewer = metadata.permission ? await requirePermission(metadata.permission as PermissionKey) : await getViewer()
  if (!viewer || viewer.status !== "ACTIVE") throw new ActionError("Your session has ended. Please sign in again.")
  if (viewer.mustChangePassword && metadata.name !== "changePassword") {
    throw new ActionError("Please change your temporary password first.")
  }
  return next({ ctx: { viewer } })
})
