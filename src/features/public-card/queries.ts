import "server-only"

import { positionLabel } from "@/features/members/positions"
import { db } from "@/lib/db"
import { fullName } from "@/lib/names"
import { signedUrl } from "@/lib/r2"

/**
 * Public member card page data (no login). Only fields agreed to be safe to show:
 * photo, name, position, tracking no., Block/Lot, status and the dates they were present.
 * Never contact number, email, address or date of birth.
 */
export async function publicMemberByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) return null
  const m = await db.member.findUnique({
    where: { cardToken: token },
    select: {
      firstName: true,
      middleName: true,
      lastName: true,
      suffix: true,
      position: true,
      trackingNumber: true,
      blockNumber: true,
      lotNumber: true,
      isActive: true,
      photoKey: true,
      attendances: {
        orderBy: { checkedInAt: "desc" },
        take: 100,
        select: { id: true, checkedInAt: true, meeting: { select: { date: true } } },
      },
      _count: { select: { attendances: true } },
    },
  })
  if (!m) return null
  if (!m.isActive) return { active: false as const }
  return {
    active: true as const,
    name: fullName(m),
    position: positionLabel(m.position),
    trackingNumber: m.trackingNumber,
    blockLot: `Block ${m.blockNumber} Lot ${m.lotNumber}`,
    photoUrl: m.photoKey ? await signedUrl(m.photoKey) : null,
    attended: m._count.attendances,
    attendance: m.attendances.map((a) => ({ id: a.id, date: a.meeting.date, checkedInAt: a.checkedInAt })),
  }
}
