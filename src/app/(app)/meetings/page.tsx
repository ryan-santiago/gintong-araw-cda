import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, MapPin, Plus, QrCode } from "lucide-react"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MeetingActions } from "@/features/meetings/components/meeting-actions"
import { MeetingFormDialog } from "@/features/meetings/components/meeting-form-dialog"
import { MeetingStatusBadge } from "@/features/meetings/components/meeting-status-badge"
import { activeMemberCount, listMeetings } from "@/features/meetings/queries"
import { formatDay, formatManila, nextSundayManila } from "@/lib/dates"
import { can, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Meetings" }

export default async function MeetingsPage() {
  const viewer = await requireViewer()
  if (!can(viewer, "meeting.view")) return <NoAccess what="meetings" />

  const [meetings, active] = await Promise.all([listMeetings(), activeMemberCount()])
  const canManage = can(viewer, "meeting.manage")
  const canCapture = can(viewer, "attendance.capture")

  return (
    <>
      <PageHeader
        title="Meetings"
        description="Open a meeting to start capturing attendance. Close it when the meeting ends."
        actions={
          canManage && (
            <MeetingFormDialog
              defaultDate={nextSundayManila()}
              trigger={
                <Button size="lg">
                  <Plus /> New meeting
                </Button>
              }
            />
          )
        }
      />

      {meetings.length === 0 ? (
        <Card className="items-center px-6 py-16 text-center">
          <CalendarDays className="size-8 text-muted-foreground" />
          <p className="font-semibold">No meetings yet</p>
          <p className="text-sm text-muted-foreground">Create the next meeting, then open it on meeting day.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {meetings.map((m) => {
            const rate = active ? Math.round((m.present / active) * 100) : 0
            return (
              <Card key={m.id} className="gap-4 px-5 md:flex-row md:items-center">
                <Link href={`/meetings/${m.id}`} className="flex min-w-0 flex-1 items-center gap-4 outline-none">
                  <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-center text-accent-foreground">
                    <span className="text-[11px] font-semibold uppercase">{formatDay(m.date, "MMM")}</span>
                    <span className="-mt-1 text-xl leading-none font-extrabold">{formatDay(m.date, "d")}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold">{m.title}</p>
                      <MeetingStatusBadge status={m.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDay(m.date, "EEEE, MMMM d, yyyy")}
                      {m.startTime && ` · ${formatManila(m.startTime, "h:mm a")}`}
                    </p>
                    {m.location && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" /> {m.location}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="flex items-center justify-between gap-4 md:justify-end">
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">
                      {m.present}
                      <span className="text-sm font-medium text-muted-foreground"> / {active}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">present · {rate}%</p>
                  </div>
                  <div className="flex gap-2">
                    {m.status === "OPEN" && canCapture && (
                      <Button asChild size="sm">
                        <Link href={`/attendance/capture?meeting=${m.id}`}>
                          <QrCode /> Capture
                        </Link>
                      </Button>
                    )}
                    {canManage && <MeetingActions size="sm" meeting={m} />}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
