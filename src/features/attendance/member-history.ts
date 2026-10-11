import "server-only"

import { dateToDay } from "@/lib/dates"
import { db } from "@/lib/db"

/** A member's check-ins (newest first) plus their rate over meetings held since they were added. */
export async function memberAttendance(memberId: string, joinedAt: Date) {
  const [rows, held] = await Promise.all([
    db.attendance.findMany({
      where: { memberId },
      orderBy: { checkedInAt: "desc" },
      take: 200,
      select: {
        id: true,
        checkedInAt: true,
        method: true,
        meeting: { select: { id: true, title: true, date: true } },
      },
    }),
    db.meeting.count({
      where: { status: { not: "SCHEDULED" }, date: { gte: new Date(`${dateToDay(joinedAt)}T00:00:00.000Z`) } },
    }),
  ])
  const attended = rows.length
  const base = Math.max(held, attended)
  return {
    rows,
    attended,
    held: base,
    rate: base ? Math.round((attended / base) * 100) : null,
    last: rows[0]?.meeting.date ?? null,
  }
}
