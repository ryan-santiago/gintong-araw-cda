// Human-readable names for audit actions. Unknown actions fall back to the raw key.
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.login_failed": "Failed sign-in",
  "user.register": "Registered",
  "user.seed_super_admin": "Super Admin created (setup)",
  "user.approve": "Approved user",
  "user.reject": "Rejected registration",
  "user.suspend": "Suspended user",
  "user.reactivate": "Reactivated user",
  "user.groups_update": "Changed user groups",
  "user.reset_password": "Reset password",
  "user.change_password": "Changed own password",
  "group.create": "Created group",
  "group.update": "Updated group",
  "group.delete": "Deleted group",
  "member.create": "Added member",
  "member.update": "Updated member",
  "member.deactivate": "Deactivated member",
  "member.restore": "Restored member",
  "member.photo_add": "Added member photo",
  "member.photo_update": "Changed member photo",
  "member.photo_remove": "Removed member photo",
  "member.export": "Exported members",
  "member.import": "Imported members",
  "member.id_generate": "Generated ID card",
  "member.card_reissue": "Reissued ID card (old card cancelled)",
  "meeting.create": "Created meeting",
  "meeting.update": "Updated meeting",
  "meeting.open": "Opened meeting",
  "meeting.close": "Closed meeting",
  "meeting.delete": "Deleted meeting",
  "attendance.capture": "Recorded attendance",
  "attendance.delete": "Removed attendance",
  "attendance.export": "Exported attendance",
  "contribution.record": "Recorded payment",
  "contribution.void": "Voided payment",
  "contribution.import": "Imported payments",
  "contribution.export": "Exported contributions",
  "contribution.schedule_update": "Changed contribution rates",
  "settings.update": "Changed settings",
}

export function auditActionLabel(action: string) {
  return AUDIT_ACTION_LABELS[action] ?? action
}

export function auditActionTone(action: string) {
  if (
    action.endsWith("_failed") ||
    action.endsWith(".delete") ||
    action.endsWith(".reject") ||
    action.endsWith(".suspend") ||
    action.endsWith(".deactivate") ||
    action.endsWith(".void") ||
    action.endsWith("_remove")
  )
    return "danger"
  if (action.startsWith("auth.")) return "muted"
  if (
    action.endsWith(".create") ||
    action.endsWith(".approve") ||
    action.endsWith(".register") ||
    action.endsWith(".restore") ||
    action.endsWith(".record")
  )
    return "success"
  return "gold"
}
