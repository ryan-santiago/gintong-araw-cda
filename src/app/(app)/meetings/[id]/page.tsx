import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Download, MapPin, Pencil, QrCode, Users } from "lucide-react"

import { NoAccess } from "@/components/shared/no-access"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RemoveAttendanceButton } from "@/features/attendance/components/remove-attendance-button"
import { MeetingActions } from "@/features/meetings/components/meeting-actions"
import { MeetingFormDialog } from "@/features/meetings/components/meeting-form-dialog"
import { MeetingStatusBadge } from "@/features/meetings/components/meeting-status-badge"
import { activeMemberCount, getMeeting } from "@/features/meetings/queries"
import { MemberAvatar } from "@/features/members/components/member-avatar"
import { dateToDay, formatDay, formatManila } from "@/lib/dates"
import { memberInitials } from "@/lib/names"
import { can, requireViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Meeting" }

export default async function MeetingPage({ params }: PageProps<"/meetings/[id]">) {
  const viewer = await requireViewer()
  if (!can(viewer, "meeting.view")) return <NoAccess what="meetings" />

  const { id } = await params
  const [meeting, active] = await Promise.all([getMeeting(id), activeMemberCount()])
  if (!meeting) notFound()

  const present = meeting.attendances.length
  const rate = active ? Math.round((present / active) * 100) : 0
  const day = dateToDay(meeting.date)
  const canDelete = can(viewer, "attendance.delete")

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground">
        <Link href="/meetings">
          <ArrowLeft /> Meetings
        </Link>
      </Button>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight md:text-[26px]">{meeting.title}</h1>
            <MeetingStatusBadge status={meeting.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDay(meeting.date, "EEEE, MMMM d, yyyy")}
            {meeting.startTime && ` · ${formatManila(meeting.startTime, "h:mm a")}`}
          </p>
          {meeting.location && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" /> {meeting.location}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {meeting.status === "OPEN" && can(viewer, "attendance.capture") && (
            <Button asChild size="lg">
              <Link href={`/attendance/capture?meeting=${meeting.id}`}>
                <QrCode /> Capture attendance
              </Link>
            </Button>
          )}
          {can(viewer, "attendance.export") && (
            <Button asChild variant="outline" size="lg">
              <a href={`/api/attendance/export?from=${day}&to=${day}&format=xlsx`} download>
                <Download /> Export
              </a>
            </Button>
          )}
          {can(viewer, "meeting.manage") && (
            <>
              <MeetingFormDialog
                initial={{
                  id: meeting.id,
                  title: meeting.title,
                  date: day,
                  startTime: meeting.startTime ? formatManila(meeting.startTime, "HH:mm") : "",
                  location: meeting.location ?? "",
                  notes: meeting.notes ?? "",
                }}
                trigger={
                  <Button variant="outline" size="lg">
                    <Pencil /> Edit
                  </Button>
                }
              />
              <MeetingActions
                meeting={{ id: meeting.id, title: meeting.title, status: meeting.status, present }}
                redirectAfterDelete="/meetings"
              />
            </>
          )}
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Present" value={present} />
        <Stat label="Active members" value={active} />
        <Stat label="Attendance rate" value={`${rate}%`} bar={rate} />
      </div>

      {meeting.notes && (
        <Card className="mb-4 px-5 text-sm whitespace-pre-line text-muted-foreground">{meeting.notes}</Card>
      )}

      <Card className="gap-0 py-0">
        {present === 0 ? (
          <div className="grid justify-items-center gap-2 px-6 py-16 text-center">
            <Users className="size-8 text-muted-foreground" />
            <p className="font-semibold">No one checked in yet</p>
            <p className="text-sm text-muted-foreground">
              {meeting.status === "OPEN"
                ? "Use Capture attendance to scan member IDs."
                : "Open the meeting to start capturing attendance."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Member</TableHead>
                <TableHead className="hidden sm:table-cell">Tracking no.</TableHead>
                <TableHead>Time in</TableHead>
                <TableHead className="hidden md:table-cell">Method</TableHead>
                <TableHead className="hidden lg:table-cell">Recorded by</TableHead>
                <TableHead className="w-12 pr-5">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meeting.attendances.map((a) => (
                <TableRow key={a.id} className="hover:bg-accent/60">
                  <TableCell className="w-full max-w-0 py-2.5 pl-5">
                    <Link href={`/members/${a.member.id}`} className="flex items-center gap-3">
                      <MemberAvatar
                        src={a.member.thumbUrl}
                        initials={memberInitials(a.member)}
                        seed={a.member.id}
                        className="size-9"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{a.member.name}</span>
                        <span className="block font-mono text-xs text-muted-foreground sm:hidden">
                          {a.member.trackingNumber}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden font-mono text-[13px] sm:table-cell">
                    {a.member.trackingNumber}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatManila(a.checkedInAt, "h:mm a")}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span
                      className={
                        a.method === "QR"
                          ? "rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success"
                          : "rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground"
                      }
                    >
                      {a.method === "QR" ? "QR" : "Manual"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{a.recordedBy}</TableCell>
                  <TableCell className="pr-5 text-right">
                    {canDelete && <RemoveAttendanceButton id={a.id} name={a.member.name} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  )
}

function Stat({ label, value, bar }: { label: string; value: number | string; bar?: number }) {
  return (
    <Card className="gap-1 px-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-[28px] font-bold tracking-tight tabular-nums">{value}</p>
      {bar !== undefined && (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, bar)}%` }} />
        </div>
      )}
    </Card>
  )
}
