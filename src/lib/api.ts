import "server-only"

import type { PermissionKey } from "@/lib/permissions"
import { can, getViewer, type Viewer } from "@/lib/rbac"

/** For route handlers: the active viewer with a permission, or a JSON error response. */
export async function apiViewer(
  permission?: PermissionKey
): Promise<{ viewer: Viewer; error?: never } | { viewer?: never; error: Response }> {
  const viewer = await getViewer()
  if (!viewer || viewer.status !== "ACTIVE" || viewer.mustChangePassword) {
    return { error: Response.json({ error: "Please sign in again." }, { status: 401 }) }
  }
  if (permission && !can(viewer, permission)) {
    return { error: Response.json({ error: "You don't have permission to do that." }, { status: 403 }) }
  }
  return { viewer }
}
