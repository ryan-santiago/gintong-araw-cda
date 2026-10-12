import type { Metadata } from "next"

import { ImportWizard } from "@/components/shared/import-wizard"
import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { can, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Import payments" }

export default async function ImportPaymentsPage() {
  const viewer = await requireViewer()
  if (!can(viewer, "contribution.manage")) return <NoAccess what="importing payments" />

  return (
    <>
      <PageHeader
        title="Import payments"
        description="Load past contribution payments from an Excel or CSV file. You'll see a preview before anything is saved."
      />
      <ImportWizard
        endpoint="/api/contributions/import"
        noun={{ one: "payment", many: "payments" }}
        doneHref="/contributions?view=payments"
        intro="One row per payment received: tracking number, date paid and amount. Each payment is applied to the member's oldest unpaid month automatically. Re-importing the same file is safe — payments already recorded are skipped."
      />
    </>
  )
}
