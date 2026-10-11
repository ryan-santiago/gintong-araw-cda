import "server-only"

import { dateToDay } from "@/lib/dates"
import { db } from "@/lib/db"
import { fullName } from "@/lib/names"

/** How far back we look for missed meetings. */
const LOOKBACK_MEETINGS = 60

export type AtRiskMember = {
  id: string
  name: string
  trackingNumber: string
  blockLot: string
  photoThumbKey: string | null
  /** Consecutive closed meetings missed, counting back from the latest. */
  missed: number
  lastAttended: Date | null
}

/**
 * Active members who missed `threshold` or more closed meetings in a row (most recent first).
 * Only closed meetings count, and only those held on/after the day the member was added,
 * so new members are never flagged for meetings before they joined.
 */
export async function membersAtRisk(threshold: number): Promise<AtRiskMember[]> {
  const meetings = await db.meeting.findMany({
    where: { status: "CLOSED" },
    orderBy: [{ date: "desc" }, { closedAt: "desc" }],
    take: LOOKBACK_MEETINGS,
    select: { id: true, date: true },
  })
  if (meetings.length < threshold) return []
  const meetingIds = meetings.map((m) => m.id)

  const members = await db.member.findMany({
    where: { isActive: true },
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
      createdAt: true,
      attendances: { where: { meetingId: { in: meetingIds } }, select: { meetingId: true } },
    },
  })

  const result: AtRiskMember[] = []
  for (const m of members) {
    const attended = new Set(m.attendances.map((a) => a.meetingId))
    const joined = dateToDay(m.createdAt)
    let missed = 0
    let lastAttended: Date | null = null
    for (const meeting of meetings) {
      if (dateToDay(meeting.date) < joined) break
      if (attended.has(meeting.id)) {
        lastAttended = meeting.date
        break
      }
      missed++
    }
    if (missed >= threshold) {
      result.push({
        id: m.id,
        name: fullName(m),
        trackingNumber: m.trackingNumber,
        blockLot: `Blk ${m.blockNumber} · Lot ${m.lotNumber}`,
        photoThumbKey: m.photoThumbKey,
        missed,
        lastAttended,
      })
    }
  }
  return result.sort((a, b) => b.missed - a.missed || a.name.localeCompare(b.name))
}
