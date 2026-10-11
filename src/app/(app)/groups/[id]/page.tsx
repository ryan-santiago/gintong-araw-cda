import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Lock } from "lucide-react"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DeleteGroupButton } from "@/features/groups/components/delete-group-button"
import { GroupForm } from "@/features/groups/components/group-form"
import { getGroup } from "@/features/groups/queries"
import { PERMISSION_KEYS } from "@/lib/permissions"
import { can, outranks, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Group" }

export default async function GroupPage({ params }: PageProps<"/groups/[id]">) {
  const viewer = await requireViewer()
  if (!can(viewer, "group.view")) return <NoAccess what="groups" />

  const { id } = await params
  const group = await getGroup(id)
  if (!group) notFound()

  const editable = can(viewer, "group.manage") && !group.isSystem && outranks(viewer, group.rank)
  const permissions = group.isSystem ? PERMISSION_KEYS : group.permissions

  return (
    <>
      <PageHeader
        title={group.name}
        description={`Rank ${group.rank} · ${group.memberCount} user${group.memberCount === 1 ? "" : "s"}`}
        actions={
          editable && (
            <DeleteGroupButton id={group.id} name={group.name} memberCount={group.memberCount} redirectTo="/groups" />
          )
        }
      />
      {!editable && (
        <Alert className="mb-4">
          <Lock />
          <AlertDescription>
            {group.isSystem
              ? "This is a system group. It always has every permission and can't be changed."
              : "You can view this group but not change it. Only users with a higher rank can edit it."}
          </AlertDescription>
        </Alert>
      )}
      <GroupForm
        initial={{
          id: group.id,
          name: group.name,
          description: group.description,
          rank: group.rank,
          permissions,
        }}
        readOnly={!editable}
        heldPermissions={editable ? viewer.permissions : []}
        minRank={viewer.isSuperAdmin ? 1 : viewer.rank + 1}
      />
    </>
  )
}
