import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, Download, IdCard, Plus, QrCode, TriangleAlert, UserPlus } from "lucide-react"

import { NoAccess } from "@/components/shared/no-access"
import { PageHeader } from "@/components/shared/page-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AttendanceTrendCard } from "@/features/dashboard/components/attendance-trend-card"
import {
  sampleAtRisk,
  sampleCheckIns,
  sampleNextMeeting,
  sampleStats,
  sampleTrend,
} from "@/features/dashboard/sample-data"
import { can, requireViewer } from "@/lib/rbac"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Dashboard" }

const avatarTones = ["bg-[#d5eedd] text-[#154d34]", "bg-[#fef3c7] text-[#7a5005]", "bg-[#dbeafe] text-[#1e40af]"]

export default async function DashboardPage() {
  const viewer = await requireViewer()
  if (!can(viewer, "dashboard.view")) return <NoAccess what="the dashboard" />

  const firstName = viewer.name.split(" ")[0]
  const stats = sampleStats
  const meeting = sampleNextMeeting

  return (
    <>
      <PageHeader
        eyebrow={`Magandang araw, ${firstName} ☀️`}
        title="Dashboard"
        actions={
          <>
            <Badge
              variant="outline"
              className="hidden h-10 rounded-xl border-dashed px-3 text-muted-foreground sm:inline-flex"
            >
              Sample data
            </Badge>
            <Button asChild variant="outline" size="lg" className="border-0 shadow-card">
              <Link href="/attendance">
                <Download /> Export
              </Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/members/new">
                <Plus /> Add member
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 xl:gap-5">
        <AttendanceTrendCard total={stats.activeMembers} points={sampleTrend} />

        {/* Key rates */}
        <Card className="justify-between gap-0 divide-y divide-dashed px-5 lg:col-span-4 [&>div]:py-4 [&>div:first-child]:pt-0 [&>div:last-child]:pb-0">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Last meeting attendance</p>
            <p className="text-[28px] font-bold tracking-tight tabular-nums">{stats.lastMeetingRate}%</p>
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-success">
              <ArrowUpRight className="size-3.5" /> {stats.lastMeetingDelta}% vs previous
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Month-to-date rate</p>
            <p className="text-[28px] font-bold tracking-tight tabular-nums">{stats.monthRate}%</p>
            <Meter value={stats.monthRate} className="mt-2" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">New members this month</p>
            <p className="text-[28px] font-bold tracking-tight tabular-nums">+{stats.newThisMonth}</p>
            <p className="text-xs text-muted-foreground">{stats.awaitingIdCards} awaiting ID cards</p>
          </div>
        </Card>

        {/* Today's meeting */}
        <Card className="relative gap-0 bg-gradient-gold px-5 text-[#1c1b17] shadow-none lg:col-span-4">
          <div
            aria-hidden
            className="absolute -top-24 -right-20 size-60 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.6),transparent_65%)]"
          />
          <div className="relative flex items-center justify-between">
            <p className="font-semibold">Today&apos;s meeting</p>
            <span className="rounded-full bg-[#1c1b17] px-2.5 py-0.5 text-xs font-bold text-[#ffc727]">
              ● {meeting.status}
            </span>
          </div>
          <p className="relative mt-3 text-[34px] font-extrabold tracking-tight">{meeting.dateLabel}</p>
          <p className="relative text-sm text-[#1c1b17]/70">
            {meeting.title} · {meeting.location}
          </p>
          <div className="relative mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/45 px-2.5 py-1">{meeting.time}</span>
            <span className="rounded-full bg-white/45 px-2.5 py-1 tabular-nums">
              {meeting.checkedIn} / {stats.activeMembers} checked in
            </span>
          </div>
          <Button
            asChild
            size="lg"
            className="relative mt-5 h-12 rounded-xl bg-[#1c1b17] text-white hover:bg-[#1c1b17]/85"
          >
            <Link href="/attendance/capture">
              <QrCode className="size-5" /> Capture Attendance
            </Link>
          </Button>
        </Card>

        {/* At risk */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-semibold">Members at risk</CardTitle>
            <CardDescription>Missed 3+ meetings in a row</CardDescription>
            <CardAction>
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                <TriangleAlert className="size-3.5" /> 23
              </span>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {sampleAtRisk.map((member, i) => (
                <li key={member.tracking} className="flex items-center gap-3 py-2.5">
                  <Avatar className="size-9">
                    <AvatarFallback className={cn("text-xs font-bold", avatarTones[i % 3])}>
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{member.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {member.tracking} · {member.blockLot}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-warning tabular-nums">{member.missed}</p>
                    <p className="text-muted-foreground">missed</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Quick actions + progress */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-semibold">Quick actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid grid-cols-4 gap-2">
              <QuickAction href="/members/new" icon={UserPlus} label="Add" />
              <QuickAction href="/attendance/capture" icon={QrCode} label="Scan" />
              <QuickAction href="/members" icon={IdCard} label="ID Card" />
              <QuickAction href="/attendance" icon={Download} label="Export" />
            </div>
            <div className="grid gap-3.5">
              <Progress label="Members with photos" value={stats.withPhotos} total={stats.activeMembers} tone="green" />
              <Progress label="ID cards issued" value={stats.idsIssued} total={stats.activeMembers} />
            </div>
          </CardContent>
        </Card>

        {/* Recent check-ins */}
        <Card className="lg:col-span-12">
          <CardHeader>
            <CardTitle className="font-semibold">Recent check-ins</CardTitle>
            <CardDescription>Live from today&apos;s meeting</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">Member</th>
                  <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Tracking no.</th>
                  <th className="hidden px-3 py-2.5 font-medium md:table-cell">Block / Lot</th>
                  <th className="px-3 py-2.5 font-medium">Time in</th>
                  <th className="px-3 py-2.5 font-medium">Method</th>
                </tr>
              </thead>
              <tbody>
                {sampleCheckIns.map((row, i) => (
                  <tr key={row.tracking} className="border-b transition-colors last:border-0 hover:bg-accent">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8">
                          <AvatarFallback className={cn("text-xs font-bold", avatarTones[i % 3])}>
                            {row.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{row.name}</span>
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 font-mono text-[13px] sm:table-cell">{row.tracking}</td>
                    <td className="hidden px-3 py-3 md:table-cell">{row.blockLot}</td>
                    <td className="px-3 py-3 tabular-nums">{row.time}</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          row.method === "QR" ? "bg-success/15 text-success" : "bg-accent text-accent-foreground"
                        )}
                      >
                        {row.method}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
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
      <Meter value={(value / total) * 100} tone={tone} />
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
