import "server-only"

import { membersAtRisk } from "@/features/attendance/at-risk"
import { getAppSettings } from "@/features/settings/queries"
import { dateToDay, dayToDate, formatDay, manilaDayRange, manilaToday } from "@/lib/dates"
import { db } from "@/lib/db"
import { fullName } from "@/lib/names"
import { signedUrls } from "@/lib/r2"

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)

export async function getDashboardData() {
  const today = manilaToday()
  const monthStart = `${today.slice(0, 8)}01`
  const settings = await getAppSettings()

  const [active, newThisMonth, withPhoto, idsIssued, held, current, upcoming, atRisk, recent] = await Promise.all([
    db.member.count({ where: { isActive: true } }),
    db.member.count({ where: { isActive: true, createdAt: { gte: manilaDayRange(monthStart).start } } }),
    db.member.count({ where: { isActive: true, photoKey: { not: null } } }),
    db.member.count({ where: { isActive: true, idGeneratedAt: { not: null } } }),
    // Last 8 meetings that were opened (open or closed), oldest → newest for the chart.
    db.meeting.findMany({
      where: { status: { not: "SCHEDULED" } },
      orderBy: { date: "desc" },
      take: 8,
      select: { id: true, date: true, status: true, _count: { select: { attendances: true } } },
    }),
    db.meeting.findFirst({
      where: { status: "OPEN" },
      orderBy: { date: "desc" },
      select: {
        id: true,
        title: true,
        date: true,
        startTime: true,
        location: true,
        _count: { select: { attendances: true } },
      },
    }),
    db.meeting.findFirst({
      where: { status: "SCHEDULED", date: { gte: dayToDate(today) } },
      orderBy: { date: "asc" },
      select: { id: true, title: true, date: true, startTime: true, location: true },
    }),
    membersAtRisk(settings.atRiskThreshold),
    db.attendance.findMany({
      orderBy: { checkedInAt: "desc" },
      take: 6,
      select: {
        id: true,
        checkedInAt: true,
        method: true,
        meeting: { select: { date: true } },
        member: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            suffix: true,
            trackingNumber: true,
            blockNumber: true,
            lotNumber: true,
            photoThumbKey: true,
          },
        },
      },
    }),
  ])

  const trend = [...held].reverse().map((m) => ({
    id: m.id,
    label: formatDay(m.date, "MMM d"),
    present: m._count.attendances,
    live: m.status === "OPEN",
  }))

  const closed = held.filter((m) => m.status === "CLOSED")
  const last = closed[0] ?? null
  const previous = closed[1] ?? null
  const lastRate = last ? pct(last._count.attendances, active) : null
  const delta = last && previous ? lastRate! - pct(previous._count.attendances, active) : null

  const thisMonth = held.filter((m) => dateToDay(m.date) >= monthStart)
  const monthRate = thisMonth.length
    ? Math.round(thisMonth.reduce((sum, m) => sum + pct(m._count.attendances, active), 0) / thisMonth.length)
    : null

  const [recentThumbs, riskThumbs] = await Promise.all([
    signedUrls(recent.map((r) => r.member.photoThumbKey)),
    signedUrls(atRisk.slice(0, 5).map((m) => m.photoThumbKey)),
  ])

  return {
    settings,
    stats: { active, newThisMonth, withPhoto, idsIssued, lastRate, delta, monthRate, monthMeetings: thisMonth.length },
    trend,
    current: current ? { ...current, present: current._count.attendances } : null,
    upcoming,
    atRisk: {
      total: atRisk.length,
      top: atRisk.slice(0, 5).map((m, i) => ({ ...m, thumbUrl: riskThumbs[i] ?? null })),
    },
    recent: recent.map((r, i) => ({
      id: r.id,
      memberId: r.member.id,
      name: fullName(r.member),
      trackingNumber: r.member.trackingNumber,
      blockLot: `Blk ${r.member.blockNumber} · Lot ${r.member.lotNumber}`,
      thumbUrl: recentThumbs[i] ?? null,
      checkedInAt: r.checkedInAt,
      meetingDate: r.meeting.date,
      method: r.method,
    })),
  }
}
