import type { Metadata } from "next"
import { Link2 } from "lucide-react"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScheduleForm } from "@/features/contributions/components/schedule-form"
import { currentMonth, getContributionSchedule } from "@/features/contributions/queries"
import { SettingsForm } from "@/features/settings/components/settings-form"
import { getAppSettings } from "@/features/settings/queries"
import { env } from "@/env"
import { can, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage() {
  const viewer = await requireViewer()
  const canSettings = can(viewer, "settings.manage")
  const canRates = can(viewer, "contribution.manage")
  if (!canSettings && !canRates) return <NoAccess what="settings" />

  const [settings, schedule] = await Promise.all([getAppSettings(), getContributionSchedule()])

  return (
    <>
      <PageHeader title="Settings" description="Organization-wide defaults. Changes are recorded in the audit trail." />
      {canSettings && <SettingsForm initial={settings} />}

      {canRates && (
        <div className="mt-4">
          <ScheduleForm initial={schedule} currentMonth={currentMonth()} />
        </div>
      )}

      {canSettings && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-semibold">
              <Link2 className="size-4 text-muted-foreground" /> ID card links
            </CardTitle>
            <CardDescription>
              Every ID card QR opens this address. It is set on the server (<code>APP_URL</code>) and must not change
              after cards are printed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block rounded-xl bg-muted px-4 py-3 font-mono text-sm break-all">
              {env.APP_URL.replace(/\/+$/, "")}/m/…
            </code>
          </CardContent>
        </Card>
      )}
    </>
  )
}
