import type { Metadata } from "next"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { GroupForm } from "@/features/groups/components/group-form"
import { can, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "New group" }

export default async function NewGroupPage() {
  const viewer = await requireViewer()
  if (!can(viewer, "group.manage")) return <NoAccess what="creating groups" />

  return (
    <>
      <PageHeader title="New group" description="Create a group, set its rank and choose its permissions." />
      <GroupForm
        readOnly={false}
        heldPermissions={viewer.permissions}
        minRank={viewer.isSuperAdmin ? 1 : viewer.rank + 1}
      />
    </>
  )
}
