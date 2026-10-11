import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, Download, QrCode } from "lucide-react"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MeetingStatusBadge } from "@/features/meetings/components/meeting-status-badge"
import { activeMemberCount, listMeetings } from "@/features/meetings/queries"
import { formatDay, manilaToday } from "@/lib/dates"
import { can, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Attendance" }

export default async function AttendancePage() {
  const viewer = await requireViewer()
  if (!can(viewer, "meeting.view")) return <NoAccess what="attendance" />

  const [meetings, active] = await Promise.all([listMeetings(), activeMemberCount()])
  const held = meetings.filter((m) => m.status !== "SCHEDULED").slice(0, 12)
  const today = manilaToday()
  const monthStart = `${today.slice(0, 8)}01`

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Who came to each meeting. Members check in by scanning their ID card."
        actions={
          can(viewer, "attendance.capture") && (
            <Button asChild size="lg">
              <Link href="/attendance/capture">
                <QrCode /> Capture attendance
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Card className="gap-0 py-0">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <p className="font-semibold">Recent meetings</p>
              <p className="text-xs text-muted-foreground">Present out of {active} active members</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/meetings">All meetings</Link>
            </Button>
          </div>
          {held.length === 0 ? (
            <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
              <CalendarDays className="size-8 text-muted-foreground" />
              <p className="font-semibold">No meetings held yet</p>
              <p className="text-sm text-muted-foreground">Open a meeting on the Meetings page to start.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {held.map((m) => {
                const rate = active ? Math.round((m.present / active) * 100) : 0
                return (
                  <li key={m.id}>
                    <Link href={`/meetings/${m.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/60">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-semibold">{m.title}</span>
                          <MeetingStatusBadge status={m.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDay(m.date, "EEEE, MMMM d, yyyy")}</p>
                      </div>
                      <div className="w-32 shrink-0">
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-semibold tabular-nums">{m.present}</span>
                          <span className="text-muted-foreground tabular-nums">{rate}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(100, rate)}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {can(viewer, "attendance.export") && (
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Export attendance</CardTitle>
              <CardDescription>
                Excel includes three sheets: every check-in, a per-member summary (attended, absent, rate) and the
                meetings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action="/api/attendance/export" method="get" className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="from">From</Label>
                    <Input id="from" name="from" type="date" defaultValue={monthStart} required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="to">To</Label>
                    <Input id="to" name="to" type="date" defaultValue={today} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="submit" name="format" value="xlsx">
                    <Download /> Excel
                  </Button>
                  <Button type="submit" name="format" value="csv" variant="outline">
                    <Download /> CSV
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
