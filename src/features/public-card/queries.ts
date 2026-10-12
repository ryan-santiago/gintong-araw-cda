import "server-only"

import { getContributionSchedule, ledgerFor } from "@/features/contributions/queries"
import { positionLabel } from "@/features/members/positions"
import { db } from "@/lib/db"
import { fullName } from "@/lib/names"
import { signedUrl } from "@/lib/r2"

/**
 * Public member card page data (no login). Only fields agreed to be safe to show:
 * photo, name, position, tracking no., Block/Lot, status, the dates they were present, and their
 * contribution payments with a balance summary (voided payments are not shown).
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
      deletedAt: true,
      memberSince: true,
      photoKey: true,
      attendances: {
        orderBy: { checkedInAt: "desc" },
        take: 100,
        select: { id: true, checkedInAt: true, meeting: { select: { date: true } } },
      },
      payments: {
        where: { voidedAt: null },
        orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }],
        select: { id: true, paidOn: true, amount: true, method: true },
      },
      _count: { select: { attendances: true } },
    },
  })
  if (!m) return null
  if (!m.isActive) return { active: false as const }
  const schedule = await getContributionSchedule()
  const ledger = ledgerFor(
    schedule,
    { id: "", ...m },
    m.payments.reduce((sum, p) => sum + p.amount, 0)
  )
  return {
    active: true as const,
    name: fullName(m),
    position: positionLabel(m.position),
    trackingNumber: m.trackingNumber,
    blockLot: `Block ${m.blockNumber} Lot ${m.lotNumber}`,
    photoUrl: m.photoKey ? await signedUrl(m.photoKey) : null,
    attended: m._count.attendances,
    attendance: m.attendances.map((a) => ({ id: a.id, date: a.meeting.date, checkedInAt: a.checkedInAt })),
    payments: m.payments,
    contributions: {
      totalPaid: ledger.totalPaid,
      totalDue: ledger.totalDue,
      balance: ledger.balance,
      credit: ledger.credit,
      paidThrough: ledger.paidThrough,
      startMonth: ledger.startMonth,
      unpaidMonths: ledger.months.filter((x) => x.status !== "paid" && x.month <= ledger.endMonth).length,
    },
  }
}
