import "server-only"

import { db } from "@/lib/db"
import { fullName } from "@/lib/names"
import { signedUrls } from "@/lib/r2"

export async function activeMemberCount() {
  return db.member.count({ where: { isActive: true } })
}

/** Open meetings first, then by date (newest first). */
export async function listMeetings() {
  const meetings = await db.meeting.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: { _count: { select: { attendances: true } } },
  })
  const rank = { OPEN: 0, SCHEDULED: 1, CLOSED: 2 } as const
  return meetings
    .map((m) => ({ ...m, present: m._count.attendances }))
    .sort((a, b) => rank[a.status] - rank[b.status] || b.date.getTime() - a.date.getTime())
}

export async function openMeetings() {
  return db.meeting.findMany({
    where: { status: "OPEN" },
    orderBy: { date: "desc" },
    include: { _count: { select: { attendances: true } } },
  })
}

export async function getMeeting(id: string) {
  const meeting = await db.meeting.findUnique({
    where: { id },
    include: {
      attendances: {
        orderBy: { checkedInAt: "desc" },
        include: {
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
          recordedBy: { select: { name: true } },
        },
      },
    },
  })
  if (!meeting) return null
  const thumbs = await signedUrls(meeting.attendances.map((a) => a.member.photoThumbKey))
  return {
    ...meeting,
    attendances: meeting.attendances.map((a, i) => ({
      id: a.id,
      checkedInAt: a.checkedInAt,
      method: a.method,
      recordedBy: a.recordedBy.name,
      member: { ...a.member, name: fullName(a.member), thumbUrl: thumbs[i] ?? null },
    })),
  }
}
