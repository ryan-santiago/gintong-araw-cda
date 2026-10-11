import type { Metadata } from "next"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { MemberForm } from "@/features/members/components/member-form"
import { can, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Add member" }

export default async function NewMemberPage() {
  const viewer = await requireViewer()
  if (!can(viewer, "member.create")) return <NoAccess what="adding members" />

  return (
    <>
      <PageHeader
        title="Add member"
        description="Only the fields marked * are required. You can complete the rest later."
      />
      <MemberForm canEditPhoto={can(viewer, "member.update")} />
    </>
  )
}
