import "server-only"

import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PERMISSION_KEYS, SUPER_ADMIN_GROUP, isPermissionKey, type PermissionKey } from "@/lib/permissions"

export type Viewer = {
  id: string
  name: string
  email: string
  status: "PENDING" | "ACTIVE" | "SUSPENDED"
  mustChangePassword: boolean
  groups: { id: string; name: string; rank: number }[]
  /** Best (lowest) rank among the user's groups; Infinity when the user has no group. */
  rank: number
  isSuperAdmin: boolean
  permissions: PermissionKey[]
}

/** The signed-in user with groups, rank and effective permissions. One DB read per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      groups: {
        include: { group: { include: { permissions: { include: { permission: { select: { key: true } } } } } } },
      },
    },
  })
  if (!user) return null

  const groups = user.groups.map(({ group }) => group)
  const isSuperAdmin = groups.some((g) => g.isSystem && g.name === SUPER_ADMIN_GROUP)
  const permissions = isSuperAdmin
    ? PERMISSION_KEYS
    : [...new Set(groups.flatMap((g) => g.permissions.map((p) => p.permission.key)))].filter(isPermissionKey)

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    groups: groups.map((g) => ({ id: g.id, name: g.name, rank: g.rank })).sort((a, b) => a.rank - b.rank),
    rank: groups.length ? Math.min(...groups.map((g) => g.rank)) : Number.POSITIVE_INFINITY,
    isSuperAdmin,
    permissions,
  }
})

export function can(viewer: Pick<Viewer, "permissions">, permission: PermissionKey) {
  return viewer.permissions.includes(permission)
}

/** True when the viewer outranks the given rank (strictly lower number). */
export function outranks(viewer: Pick<Viewer, "rank" | "isSuperAdmin">, rank: number) {
  return viewer.isSuperAdmin || viewer.rank < rank
}

/**
 * For pages and layouts: returns the active viewer or redirects to the right screen.
 * Must be awaited inside a <Suspense> boundary (it reads the session cookie).
 */
export async function requireViewer() {
  const viewer = await getViewer()
  if (!viewer) redirect("/login")
  if (viewer.status !== "ACTIVE") redirect("/pending")
  if (viewer.mustChangePassword) redirect("/change-password")
  if (viewer.groups.length === 0) redirect("/pending?reason=no-access")
  return viewer
}

/** Thrown by server actions; its message is safe to show to the user. */
export class ActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ActionError"
  }
}

export async function requirePermission(permission: PermissionKey) {
  const viewer = await getViewer()
  if (!viewer || viewer.status !== "ACTIVE") throw new ActionError("Your session has ended. Please sign in again.")
  if (!can(viewer, permission)) throw new ActionError("You don't have permission to do that.")
  return viewer
}
