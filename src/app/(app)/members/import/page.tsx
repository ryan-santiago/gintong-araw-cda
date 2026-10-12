import type { Metadata } from "next"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { ImportWizard } from "@/components/shared/import-wizard"
import { can, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Import members" }

export default async function ImportMembersPage() {
  const viewer = await requireViewer()
  if (!can(viewer, "member.create")) return <NoAccess what="importing members" />

  return (
    <>
      <PageHeader
        title="Import members"
        description="Add many households at once from an Excel or CSV file. You'll see a preview before anything is saved."
      />
      <ImportWizard
        endpoint="/api/members/import"
        noun={{ one: "member", many: "members" }}
        doneHref="/members"
        intro="One row per household. Required: tracking number, last name, first name, block and lot. A Members export from this app also works."
      />
    </>
  )
}
