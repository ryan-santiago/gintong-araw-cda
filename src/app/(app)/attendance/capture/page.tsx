import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays } from "lucide-react"

import { NoAccess } from "@/components/shared/no-access"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CaptureScreen } from "@/features/attendance/components/capture-screen"
import { StartTodayButton } from "@/features/attendance/components/start-today-button"
import { captureStatus } from "@/features/attendance/queries"
import { openMeetings } from "@/features/meetings/queries"
import { db } from "@/lib/db"
import { formatDay } from "@/lib/dates"
import { can, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Capture attendance" }

export default async function CaptureAttendancePage({ searchParams }: PageProps<"/attendance/capture">) {
  const viewer = await requireViewer()
  if (!can(viewer, "attendance.capture")) return <NoAccess what="attendance capture" />

  const params = await searchParams
  const requested = typeof params.meeting === "string" ? params.meeting : null
  const open = await openMeetings()
  const meeting =
    open.find((m) => m.id === requested) ??
    (requested ? await db.meeting.findUnique({ where: { id: requested } }) : null) ??
    open[0] ??
    null

  if (!meeting) {
    return (
      <Card className="mx-auto mt-6 max-w-md items-center px-6 py-12 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <CalendarDays className="size-6" />
        </span>
        <div>
          <h1 className="text-lg font-bold">No meeting is open</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Attendance is recorded against an open meeting.
            {can(viewer, "meeting.manage")
              ? " Start today's meeting to begin scanning."
              : " Ask an officer to open it."}
          </p>
        </div>
        {can(viewer, "meeting.manage") && <StartTodayButton />}
        <Button asChild variant="ghost">
          <Link href="/meetings">Go to meetings</Link>
        </Button>
      </Card>
    )
  }

  return (
    <CaptureScreen
      key={meeting.id}
      meeting={{ id: meeting.id, title: meeting.title, dateLabel: formatDay(meeting.date, "EEE, MMM d") }}
      openMeetings={open.map((m) => ({ id: m.id, label: `${m.title} · ${formatDay(m.date, "EEE, MMM d")}` }))}
      initialStatus={await captureStatus(meeting.id)}
    />
  )
}
