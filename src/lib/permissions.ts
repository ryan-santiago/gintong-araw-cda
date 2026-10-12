// Permission catalog — the source of truth. The seed syncs it into the database.
// See docs/05-roles-permissions.md. Safe to import from client components.

export const PERMISSIONS = {
  "dashboard.view": { module: "Dashboard", description: "View dashboard widgets" },

  "member.view": { module: "Members", description: "List and view members, including photos and contact info" },
  "member.create": { module: "Members", description: "Add members" },
  "member.update": { module: "Members", description: "Edit members and change photos" },
  "member.deactivate": { module: "Members", description: "Deactivate (soft-delete) a member" },
  "member.restore": { module: "Members", description: "Reactivate a member" },
  "member.export": { module: "Members", description: "Export the member list" },
  "member.generate_id": { module: "ID Cards", description: "Generate and download ID cards" },

  "meeting.view": { module: "Meetings", description: "View meetings and their attendance" },
  "meeting.manage": { module: "Meetings", description: "Create, edit, open and close meetings" },

  "attendance.capture": { module: "Attendance", description: "Scan or manually record attendance" },
  "attendance.delete": { module: "Attendance", description: "Remove a wrong attendance record" },
  "attendance.export": { module: "Attendance", description: "Export attendance by date range" },

  "contribution.view": { module: "Contributions", description: "View contributions, member balances and reports" },
  "contribution.collect": { module: "Contributions", description: "Record contribution payments (scan or manual)" },
  "contribution.void": { module: "Contributions", description: "Void a wrong payment" },
  "contribution.export": { module: "Contributions", description: "Export payments and balances" },
  "contribution.manage": { module: "Contributions", description: "Set rates and start month; import past payments" },

  "user.view": { module: "Users", description: "View users" },
  "user.approve": { module: "Users", description: "Approve or reject pending registrations" },
  "user.manage": { module: "Users", description: "Suspend/reactivate users, assign groups, reset passwords" },

  "group.view": { module: "Groups", description: "View groups and their permissions" },
  "group.manage": { module: "Groups", description: "Create, edit and delete groups and their permissions" },

  "audit.view": { module: "Audit", description: "View the audit trail" },

  "settings.manage": { module: "Settings", description: "Change organization settings and the ID layout" },
} as const satisfies Record<string, { module: string; description: string }>

export type PermissionKey = keyof typeof PERMISSIONS

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[]

export function isPermissionKey(value: string): value is PermissionKey {
  return value in PERMISSIONS
}

/** Permissions grouped by module, in catalog order (for the permission matrix). */
export const PERMISSION_MODULES = PERMISSION_KEYS.reduce<{ module: string; keys: PermissionKey[] }[]>((acc, key) => {
  const { module } = PERMISSIONS[key]
  const group = acc.find((g) => g.module === module)
  if (group) group.keys.push(key)
  else acc.push({ module, keys: [key] })
  return acc
}, [])

export const SUPER_ADMIN_GROUP = "Super Admin"

const all = PERMISSION_KEYS
const without = (...keys: PermissionKey[]) => all.filter((k) => !keys.includes(k))
const startsWith = (...prefixes: string[]) => all.filter((k) => prefixes.some((p) => k.startsWith(p)))

export const DEFAULT_GROUPS: {
  name: string
  rank: number
  description: string
  isSystem?: boolean
  permissions: PermissionKey[]
}[] = [
  {
    name: SUPER_ADMIN_GROUP,
    rank: 0,
    description: "Full access. Cannot be deleted or restricted.",
    isSystem: true,
    permissions: all,
  },
  {
    name: "Administrator",
    rank: 10,
    description: "Manages users, groups and all records.",
    permissions: without("settings.manage"),
  },
  {
    name: "Officer",
    rank: 20,
    description: "Maintains members, meetings and attendance.",
    permissions: [
      "dashboard.view",
      ...startsWith("member.", "meeting.", "attendance."),
      "contribution.view",
      "contribution.collect",
      "contribution.export",
      "audit.view",
    ],
  },
  {
    name: "Attendance Staff",
    rank: 30,
    description: "Scans IDs at meetings.",
    permissions: ["dashboard.view", "member.view", "meeting.view", "attendance.capture"],
  },
  {
    name: "Viewer",
    rank: 40,
    description: "Read-only access.",
    permissions: ["dashboard.view", "member.view", "meeting.view", "contribution.view"],
  },
]
