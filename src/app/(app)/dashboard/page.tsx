import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarPlus,
  ClipboardCheck,
  Download,
  IdCard,
  PartyPopper,
  Plus,
  QrCode,
  TriangleAlert,
  UserPlus,
} from "lucide-react"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AttendanceTrendCard } from "@/features/dashboard/components/attendance-trend-card"
import { getDashboardData } from "@/features/dashboard/queries"
import { MemberAvatar } from "@/features/members/components/member-avatar"
import { formatDay, formatManila } from "@/lib/dates"
import { can, requireViewer } from "@/lib/rbac"
import { cn, initials } from "@/lib/utils"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const viewer = await requireViewer()
  if (!can(viewer, "dashboard.view")) return <NoAccess what="the dashboard" />

  const { settings, stats, trend, current, upcoming, atRisk, recent } = await getDashboardData()
  const firstName = viewer.name.split(" ")[0]
  const canCapture = can(viewer, "attendance.capture")

  return (
    <>
      <PageHeader
        eyebrow={`Magandang araw, ${firstName} ☀️`}
        title="Dashboard"
        actions={
          <>
            {can(viewer, "attendance.export") && (
              <Button asChild variant="outline" size="lg" className="border-0 shadow-card">
                <Link href="/attendance">
                  <Download /> Export
                </Link>
              </Button>
            )}
            {can(viewer, "member.create") && (
              <Button asChild size="lg">
                <Link href="/members/new">
                  <Plus /> Add member
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 xl:gap-5">
        <AttendanceTrendCard total={stats.active} points={trend} />

        {/* Key rates */}
        <Card className="justify-between gap-0 divide-y divide-dashed px-5 lg:col-span-4 [&>div]:py-4 [&>div:first-child]:pt-0 [&>div:last-child]:pb-0">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Last meeting attendance</p>
            <p className="text-[28px] font-bold tracking-tight tabular-nums">
              {stats.lastRate === null ? "—" : `${stats.lastRate}%`}
            </p>
            {stats.delta === 0 ? (
              <p className="text-xs text-muted-foreground">Same as previous meeting</p>
            ) : stats.delta === null ? (
              <p className="text-xs text-muted-foreground">
                {stats.lastRate === null ? "No closed meetings yet" : "First closed meeting"}
              </p>
            ) : (
              <p
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold",
                  stats.delta >= 0 ? "text-success" : "text-destructive"
                )}
              >
                {stats.delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {Math.abs(stats.delta)} pts vs previous
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">This month&apos;s average</p>
            <p className="text-[28px] font-bold tracking-tight tabular-nums">
              {stats.monthRate === null ? "—" : `${stats.monthRate}%`}
            </p>
            <Meter value={stats.monthRate ?? 0} className="mt-1" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {stats.monthMeetings} meeting{stats.monthMeetings === 1 ? "" : "s"} this month
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">New members this month</p>
            <p className="text-[28px] font-bold tracking-tight tabular-nums">+{stats.newThisMonth}</p>
            <p className="text-xs text-muted-foreground">
              {stats.active - stats.withPhoto} active member{stats.active - stats.withPhoto === 1 ? "" : "s"} without a
              photo
            </p>
          </div>
        </Card>

        {/* Meeting */}
        <MeetingCard current={current} upcoming={upcoming} active={stats.active} canCapture={canCapture} />

        {/* At risk */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-semibold">Members at risk</CardTitle>
            <CardDescription>Missed {settings.atRiskThreshold}+ meetings in a row</CardDescription>
            <CardAction>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                  atRisk.total ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                )}
              >
                <TriangleAlert className="size-3.5" /> {atRisk.total}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-2">
            {atRisk.total === 0 ? (
              <div className="grid justify-items-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center">
                <PartyPopper className="size-6 text-success" />
                <p className="text-sm font-semibold">Everyone is on track</p>
                <p className="text-xs text-muted-foreground">
                  No active member has missed {settings.atRiskThreshold} closed meetings in a row.
                </p>
              </div>
            ) : (
              <>
                <ul className="divide-y">
                  {atRisk.top.map((m) => (
                    <li key={m.id}>
                      <Link href={`/members/${m.id}`} className="flex items-center gap-3 py-2.5">
                        <MemberAvatar src={m.thumbUrl} initials={initials(m.name)} seed={m.id} className="size-9" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold">{m.name}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {m.trackingNumber} · {m.blockLot}
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="font-bold text-warning tabular-nums">{m.missed}</p>
                          <p className="text-muted-foreground">missed</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/members?risk=1">View all {atRisk.total}</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-semibold">Quick actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid grid-cols-4 gap-2">
              {can(viewer, "member.create") && <QuickAction href="/members/new" icon={UserPlus} label="Add" />}
              {canCapture && <QuickAction href="/attendance/capture" icon={QrCode} label="Scan" />}
              {can(viewer, "member.generate_id") && <QuickAction href="/members" icon={IdCard} label="ID cards" />}
              {can(viewer, "meeting.view") && <QuickAction href="/meetings" icon={ClipboardCheck} label="Meetings" />}
            </div>
            <div className="grid gap-3.5">
              <Progress label="Members with photos" value={stats.withPhoto} total={stats.active} tone="green" />
              <Progress label="ID cards generated" value={stats.idsIssued} total={stats.active} />
            </div>
          </CardContent>
        </Card>

        {/* Recent check-ins */}
        <Card className="lg:col-span-12">
          <CardHeader>
            <CardTitle className="font-semibold">Recent check-ins</CardTitle>
            <CardDescription>Latest attendance across meetings</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {recent.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No check-ins yet. They&apos;ll appear here once a meeting starts.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2.5 font-medium">Member</th>
                    <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Tracking no.</th>
                    <th className="hidden px-3 py-2.5 font-medium md:table-cell">Block / Lot</th>
                    <th className="px-3 py-2.5 font-medium">Time in</th>
                    <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id} className="border-b transition-colors last:border-0 hover:bg-accent">
                      <td className="px-3 py-2.5">
                        <Link href={`/members/${row.memberId}`} className="flex items-center gap-2.5">
                          <MemberAvatar
                            src={row.thumbUrl}
                            initials={initials(row.name)}
                            seed={row.memberId}
                            className="size-8"
                          />
                          <span className="font-semibold">{row.name}</span>
                        </Link>
                      </td>
                      <td className="hidden px-3 py-2.5 font-mono text-[13px] sm:table-cell">{row.trackingNumber}</td>
                      <td className="hidden px-3 py-2.5 md:table-cell">{row.blockLot}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                        {formatManila(row.checkedInAt, "h:mm a")}
                        <span className="text-muted-foreground"> · {formatDay(row.meetingDate, "MMM d")}</span>
                      </td>
                      <td className="hidden px-3 py-2.5 sm:table-cell">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            row.method === "QR" ? "bg-success/15 text-success" : "bg-accent text-accent-foreground"
                          )}
                        >
                          {row.method === "QR" ? "QR" : "Manual"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

type MeetingInfo = { id: string; title: string; date: Date; startTime: Date | null; location: string | null }

function MeetingCard({
  current,
  upcoming,
  active,
  canCapture,
}: {
  current: (MeetingInfo & { present: number }) | null
  upcoming: MeetingInfo | null
  active: number
  canCapture: boolean
}) {
  const meeting = current ?? upcoming
  if (!meeting) {
    return (
      <Card className="items-start gap-3 px-5 lg:col-span-4">
        <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
          <CalendarPlus className="size-5" />
        </span>
        <div>
          <p className="font-semibold">No upcoming meeting</p>
          <p className="text-sm text-muted-foreground">Schedule the next one so it&apos;s ready on meeting day.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/meetings">Go to meetings</Link>
        </Button>
      </Card>
    )
  }

  return (
    <Card className="relative gap-0 bg-gradient-gold px-5 text-[#1c1b17] shadow-none lg:col-span-4">
      <div
        aria-hidden
        className="absolute -top-24 -right-20 size-60 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.6),transparent_65%)]"
      />
      <div className="relative flex items-center justify-between">
        <p className="font-semibold">{current ? "Meeting in progress" : "Next meeting"}</p>
        <span className="rounded-full bg-[#1c1b17] px-2.5 py-0.5 text-xs font-bold text-[#ffc727]">
          {current ? "● OPEN" : "SCHEDULED"}
        </span>
      </div>
      <p className="relative mt-3 text-[34px] leading-tight font-extrabold tracking-tight">
        {formatDay(meeting.date, "EEE, MMM d")}
      </p>
      <p className="relative text-sm text-[#1c1b17]/70">
        {meeting.title}
        {meeting.location && ` · ${meeting.location}`}
      </p>
      <div className="relative mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        {meeting.startTime && (
          <span className="rounded-full bg-white/45 px-2.5 py-1">{formatManila(meeting.startTime, "h:mm a")}</span>
        )}
        {current && (
          <span className="rounded-full bg-white/45 px-2.5 py-1 tabular-nums">
            {current.present} / {active} checked in
          </span>
        )}
      </div>
      <Button asChild size="lg" className="relative mt-5 h-12 rounded-xl bg-[#1c1b17] text-white hover:bg-[#1c1b17]/85">
        {current && canCapture ? (
          <Link href={`/attendance/capture?meeting=${current.id}`}>
            <QrCode className="size-5" /> Capture Attendance
          </Link>
        ) : (
          <Link href={`/meetings/${meeting.id}`}>View meeting</Link>
        )}
      </Button>
    </Card>
  )
}

function Meter({ value, tone = "gold", className }: { value: number; tone?: "gold" | "green"; className?: string }) {
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full", tone === "green" ? "bg-secondary" : "bg-primary")}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

function Progress({
  label,
  value,
  total,
  tone,
}: {
  label: string
  value: number
  total: number
  tone?: "gold" | "green"
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {value} / {total}
        </span>
      </div>
      <Meter value={total ? (value / total) * 100 : 0} tone={tone} />
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-1.5 rounded-xl text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid size-12 place-items-center rounded-xl border bg-card transition-colors group-hover:border-primary group-hover:bg-accent">
        <Icon className="size-5" />
      </span>
      {label}
    </Link>
  )
}
