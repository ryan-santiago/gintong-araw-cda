import "server-only"

import { cache } from "react"

import {
  addMonths,
  buildLedger,
  memberEndMonth,
  memberStartMonth,
  rateFor,
  type Ledger,
  type Month,
  type Schedule,
} from "@/features/contributions/ledger"
import { DEFAULT_SCHEDULE, SCHEDULE_SETTING_KEY, scheduleSchema } from "@/features/contributions/schema"
import { dayToDate, formatManila, manilaToday } from "@/lib/dates"
import { db } from "@/lib/db"
import { fullName } from "@/lib/names"

export const currentMonth = (): Month => manilaToday().slice(0, 7)
export const manilaMonthOf = (d: Date): Month => formatManila(d, "yyyy-MM")

/** Start month + rate table from Settings (defaults: Jan 2026, ₱1,000 → ₱1,500 from Nov 2026). */
export const getContributionSchedule = cache(async (): Promise<Schedule> => {
  const row = await db.setting.findUnique({ where: { key: SCHEDULE_SETTING_KEY } })
  const parsed = scheduleSchema.safeParse(row?.value)
  return parsed.success ? parsed.data : DEFAULT_SCHEDULE
})

type LedgerMember = { id: string; memberSince: Date | null; isActive: boolean; deletedAt: Date | null }

export function ledgerFor(schedule: Schedule, member: LedgerMember, totalPaid: number, month = currentMonth()) {
  return buildLedger({
    schedule,
    startMonth: memberStartMonth(schedule, member.memberSince),
    endMonth: member.isActive ? month : memberEndMonth(month, member.deletedAt, manilaMonthOf),
    currentMonth: month,
    totalPaid,
  })
}

/** Total of non-voided payments per member. */
async function paidByMember(memberIds?: string[]) {
  const rows = await db.contributionPayment.groupBy({
    by: ["memberId"],
    where: { voidedAt: null, ...(memberIds ? { memberId: { in: memberIds } } : {}) },
    _sum: { amount: true },
  })
  return new Map(rows.map((r) => [r.memberId, r._sum.amount ?? 0]))
}

/** One member's ledger and payment history (newest first, voided included). */
export async function memberContributions(member: LedgerMember) {
  const [schedule, payments] = await Promise.all([
    getContributionSchedule(),
    db.contributionPayment.findMany({
      where: { memberId: member.id },
      orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }],
      take: 300,
      select: {
        id: true,
        amount: true,
        paidOn: true,
        method: true,
        source: true,
        reference: true,
        notes: true,
        createdAt: true,
        voidedAt: true,
        voidReason: true,
        recordedBy: { select: { name: true } },
        voidedBy: { select: { name: true } },
      },
    }),
  ])
  const totalPaid = payments.filter((p) => !p.voidedAt).reduce((sum, p) => sum + p.amount, 0)
  return { ledger: ledgerFor(schedule, member, totalPaid), payments }
}

export type MemberBalance = {
  id: string
  name: string
  trackingNumber: string
  blockNumber: string
  lotNumber: string
  photoThumbKey: string | null
  ledger: Ledger
}

/** Ledgers for every active member (≈500 rows — computed in memory from one grouped query). */
export async function activeMemberBalances(): Promise<MemberBalance[]> {
  const [schedule, members, paid] = await Promise.all([
    getContributionSchedule(),
    db.member.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
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
        memberSince: true,
        isActive: true,
        deletedAt: true,
      },
    }),
    paidByMember(),
  ])
  const month = currentMonth()
  return members.map((m) => ({
    id: m.id,
    name: fullName(m),
    trackingNumber: m.trackingNumber,
    blockNumber: m.blockNumber,
    lotNumber: m.lotNumber,
    photoThumbKey: m.photoThumbKey,
    ledger: ledgerFor(schedule, m, paid.get(m.id) ?? 0, month),
  }))
}

const monthRange = (month: Month) => ({ gte: dayToDate(`${month}-01`), lt: dayToDate(`${addMonths(month, 1)}-01`) })

/** Expected (dues of every member owing that month) vs collected (payments dated in that month). */
export async function monthSummary(month: Month) {
  const [schedule, members, collected] = await Promise.all([
    getContributionSchedule(),
    db.member.findMany({
      where: { OR: [{ isActive: true }, { deletedAt: { gte: dayToDate(`${month}-01`) } }] },
      select: { memberSince: true, isActive: true, deletedAt: true },
    }),
    db.contributionPayment.aggregate({
      where: { voidedAt: null, paidOn: monthRange(month) },
      _sum: { amount: true },
      _count: true,
    }),
  ])
  const due = rateFor(month, schedule.rates)
  const owing = members.filter((m) => {
    if (memberStartMonth(schedule, m.memberSince) > month) return false
    return m.isActive || !m.deletedAt || manilaMonthOf(m.deletedAt) >= month
  }).length
  const expected = owing * due
  const total = collected._sum.amount ?? 0
  return {
    month,
    rate: due,
    owing,
    expected,
    collected: total,
    payments: collected._count,
    ratePct: expected ? Math.round((total / expected) * 100) : null,
  }
}

export type PaymentFilters = { from: string; to: string; q: string; voided: boolean; page: number }

export const PAYMENT_PAGE_SIZE = 30

export function paymentWhere(f: Pick<PaymentFilters, "from" | "to" | "q" | "voided">) {
  const words = f.q.split(/\s+/).filter(Boolean).slice(0, 5)
  return {
    paidOn: { gte: dayToDate(f.from), lte: dayToDate(f.to) },
    ...(f.voided ? {} : { voidedAt: null }),
    ...(words.length
      ? {
          member: {
            AND: words.map((w) => ({
              OR: [
                { firstName: { contains: w, mode: "insensitive" as const } },
                { lastName: { contains: w, mode: "insensitive" as const } },
                { trackingNumber: { contains: w } },
              ],
            })),
          },
        }
      : {}),
  }
}

export async function listPayments(f: PaymentFilters) {
  const where = paymentWhere(f)
  const [rows, total, sum] = await Promise.all([
    db.contributionPayment.findMany({
      where,
      orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }],
      skip: (f.page - 1) * PAYMENT_PAGE_SIZE,
      take: PAYMENT_PAGE_SIZE,
      select: {
        id: true,
        amount: true,
        paidOn: true,
        method: true,
        source: true,
        reference: true,
        createdAt: true,
        voidedAt: true,
        voidReason: true,
        recordedBy: { select: { name: true } },
        member: {
          select: { id: true, firstName: true, middleName: true, lastName: true, suffix: true, trackingNumber: true },
        },
      },
    }),
    db.contributionPayment.count({ where }),
    db.contributionPayment.aggregate({ where: { ...where, voidedAt: null }, _sum: { amount: true } }),
  ])
  return { rows, total, sum: sum._sum.amount ?? 0 }
}

/** Collected today (Manila): everyone's total, the viewer's own total, and the latest entries. */
export async function collectStatus(viewerId: string) {
  const today = dayToDate(manilaToday())
  const where = { voidedAt: null, paidOn: today }
  const [all, mine, recent] = await Promise.all([
    db.contributionPayment.aggregate({ where, _sum: { amount: true }, _count: true }),
    db.contributionPayment.aggregate({
      where: { ...where, recordedById: viewerId },
      _sum: { amount: true },
      _count: true,
    }),
    db.contributionPayment.findMany({
      where: { voidedAt: null, source: { not: "IMPORT" }, createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        method: true,
        createdAt: true,
        member: { select: { firstName: true, middleName: true, lastName: true, suffix: true, trackingNumber: true } },
      },
    }),
  ])
  return {
    total: all._sum.amount ?? 0,
    count: all._count,
    mine: mine._sum.amount ?? 0,
    mineCount: mine._count,
    recent: recent.map((p) => ({
      id: p.id,
      name: fullName(p.member),
      trackingNumber: p.member.trackingNumber,
      amount: p.amount,
      method: p.method,
      createdAt: p.createdAt.toISOString(),
    })),
  }
}

export type CollectStatus = Awaited<ReturnType<typeof collectStatus>>
