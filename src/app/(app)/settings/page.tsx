import type { Metadata } from "next"

import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata: Metadata = { title: "Settings" }

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Organization and ID card settings"
      phase="Phase 5 · Dashboard & Insights"
      features={[
        "Organization name and default meeting day",
        "At-risk threshold (consecutive absences)",
        "ID card layout positions",
      ]}
    />
  )
}
