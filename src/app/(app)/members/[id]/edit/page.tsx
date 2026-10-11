import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { MemberForm } from "@/features/members/components/member-form"
import { toFormValues } from "@/features/members/form-values"
import { getMember } from "@/features/members/queries"
import { fullName } from "@/lib/names"
import { can, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Edit member" }

export default async function EditMemberPage({ params }: PageProps<"/members/[id]/edit">) {
  const viewer = await requireViewer()
  if (!can(viewer, "member.update")) return <NoAccess what="editing members" />

  const { id } = await params
  const member = await getMember(id)
  if (!member) notFound()

  return (
    <>
      <PageHeader title={`Edit ${fullName(member)}`} description={`Tracking no. ${member.trackingNumber}`} />
      <MemberForm canEditPhoto member={{ id: member.id, values: toFormValues(member), photoUrl: member.photoUrl }} />
    </>
  )
}
