import "server-only"

import { db } from "@/lib/db"
import { fullName } from "@/lib/names"

/** Live numbers for the capture screen. */
export async function captureStatus(meetingId: string) {
  const [meeting, present, active, recent] = await Promise.all([
    db.meeting.findUnique({ where: { id: meetingId }, select: { status: true } }),
    db.attendance.count({ where: { meetingId } }),
    db.member.count({ where: { isActive: true } }),
    db.attendance.findMany({
      where: { meetingId },
      orderBy: { checkedInAt: "desc" },
      take: 8,
      select: {
        id: true,
        checkedInAt: true,
        method: true,
        member: { select: { firstName: true, middleName: true, lastName: true, suffix: true, trackingNumber: true } },
      },
    }),
  ])
  return {
    status: meeting?.status ?? "CLOSED",
    present,
    active,
    recent: recent.map((r) => ({
      id: r.id,
      name: fullName(r.member),
      trackingNumber: r.member.trackingNumber,
      method: r.method,
      checkedInAt: r.checkedInAt.toISOString(),
    })),
  }
}
