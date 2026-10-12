"use server"

import { z } from "zod"

import { formatMonth, formatPeso, rateFor, toCentavos } from "@/features/contributions/ledger"
import { collectStatus, currentMonth, getContributionSchedule, ledgerFor } from "@/features/contributions/queries"
import {
  SCHEDULE_SETTING_KEY,
  recordPaymentSchema,
  scheduleSchema,
  voidPaymentSchema,
} from "@/features/contributions/schema"
import { positionLabel } from "@/features/members/positions"
import { writeAudit } from "@/lib/audit"
import { parseCardToken } from "@/lib/card-link"
import { dateToDay, dayToDate, formatManila, manilaToday } from "@/lib/dates"
import { db } from "@/lib/db"
import { fullName } from "@/lib/names"
import { signedUrl, signedUrls } from "@/lib/r2"
import { ActionError } from "@/lib/rbac"
import { actionClient } from "@/lib/safe-action"

const REPEAT_WINDOW_MS = 10 * 60_000

const memberSelect = {
  id: true,
  firstName: true,
  middleName: true,
  lastName: true,
  suffix: true,
  trackingNumber: true,
  blockNumber: true,
  lotNumber: true,
  position: true,
  photoThumbKey: true,
  memberSince: true,
  isActive: true,
  deletedAt: true,
} as const

export type PayMember = {
  id: string
  name: string
  trackingNumber: string
  blockLot: string
  position: string
  thumbUrl: string | null
  isActive: boolean
  balance: number
  credit: number
  paidThrough: string | null
  overdueMonths: number
  /** This month's rate (centavos). */
  monthlyDue: number
  /** Oldest months not fully paid, through the current month. */
  unpaid: { month: string; label: string; owed: number }[]
}

export type LookupResult = { status: "found"; member: PayMember } | { status: "invalid"; message: string }

async function payMember(memberId: string): Promise<PayMember | null> {
  const m = await db.member.findUnique({ where: { id: memberId }, select: memberSelect })
  if (!m) return null
  const [schedule, paid] = await Promise.all([
    getContributionSchedule(),
    db.contributionPayment.aggregate({ where: { memberId, voidedAt: null }, _sum: { amount: true } }),
  ])
  const month = currentMonth()
  const ledger = ledgerFor(schedule, m, paid._sum.amount ?? 0, month)
  return {
    id: m.id,
    name: fullName(m),
    trackingNumber: m.trackingNumber,
    blockLot: `Blk ${m.blockNumber} · Lot ${m.lotNumber}`,
    position: positionLabel(m.position),
    thumbUrl: m.photoThumbKey ? await signedUrl(m.photoThumbKey) : null,
    isActive: m.isActive,
    balance: ledger.balance,
    credit: ledger.credit,
    paidThrough: ledger.paidThrough,
    overdueMonths: ledger.overdueMonths,
    monthlyDue: rateFor(month, schedule.rates),
    unpaid: ledger.months
      .filter((x) => x.status !== "paid" && x.month <= month)
      .map((x) => ({ month: x.month, label: formatMonth(x.month), owed: x.due - x.paid })),
  }
}

export const lookupMemberByCard = actionClient
  .metadata({ name: "lookupMemberByCard", permission: "contribution.collect" })
  .inputSchema(z.object({ text: z.string().max(500) }))
  .action(async ({ parsedInput: { text } }): Promise<LookupResult> => {
    const token = parseCardToken(text)
    if (!token) return { status: "invalid", message: "Not a Gintong Araw member ID." }
    const m = await db.member.findUnique({ where: { cardToken: token }, select: { id: true } })
    if (!m) return { status: "invalid", message: "Unknown or cancelled ID card. It may have been reissued." }
    const member = await payMember(m.id)
    return member ? { status: "found", member } : { status: "invalid", message: "Member not found." }
  })

export const lookupMemberById = actionClient
  .metadata({ name: "lookupMemberById", permission: "contribution.collect" })
  .inputSchema(z.object({ memberId: z.string().min(1) }))
  .action(async ({ parsedInput: { memberId } }): Promise<LookupResult> => {
    const member = await payMember(memberId)
    return member ? { status: "found", member } : { status: "invalid", message: "Member not found." }
  })

/** Live search for manual entry: tracking number or name. */
export const searchMembersForPayment = actionClient
  .metadata({ name: "searchMembersForPayment", permission: "contribution.collect" })
  .inputSchema(z.object({ q: z.string().trim().max(60) }))
  .action(async ({ parsedInput: { q } }) => {
    const words = q.split(/\s+/).filter(Boolean).slice(0, 5)
    if (!words.length) return { members: [] }
    const members = await db.member.findMany({
      where: {
        isActive: true,
        AND: words.map((w) => ({
          OR: [
            { firstName: { contains: w, mode: "insensitive" } },
            { middleName: { contains: w, mode: "insensitive" } },
            { lastName: { contains: w, mode: "insensitive" } },
            { trackingNumber: { contains: w } },
          ],
        })),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 8,
      select: memberSelect,
    })
    const thumbs = await signedUrls(members.map((m) => m.photoThumbKey))
    return {
      members: members.map((m, i) => ({
        id: m.id,
        name: fullName(m),
        trackingNumber: m.trackingNumber,
        blockLot: `Blk ${m.blockNumber} · Lot ${m.lotNumber}`,
        thumbUrl: thumbs[i] ?? null,
      })),
    }
  })

export type RecordResult =
  { status: "recorded"; paymentId: string; amount: number; member: PayMember } | { status: "repeat"; message: string }

export const recordPayment = actionClient
  .metadata({ name: "recordPayment", permission: "contribution.collect" })
  .inputSchema(recordPaymentSchema)
  .action(async ({ parsedInput: input, ctx: { viewer } }): Promise<RecordResult> => {
    if (input.paidOn > manilaToday()) throw new ActionError("The payment date can't be in the future.")
    if (input.paidOn < "2020-01-01") throw new ActionError("Check the payment date.")
    const member = await db.member.findUnique({ where: { id: input.memberId }, select: memberSelect })
    if (!member) throw new ActionError("That member no longer exists.")

    if (!input.confirmRepeat) {
      const recent = await db.contributionPayment.findFirst({
        where: {
          memberId: member.id,
          voidedAt: null,
          source: { not: "IMPORT" }, // past payments loaded from a file aren't a double collection
          createdAt: { gte: new Date(Date.now() - REPEAT_WINDOW_MS) },
        },
        orderBy: { createdAt: "desc" },
        select: { amount: true, createdAt: true, recordedBy: { select: { name: true } } },
      })
      if (recent) {
        return {
          status: "repeat",
          message: `${formatPeso(recent.amount)} was already recorded for this member at ${formatManila(recent.createdAt, "h:mm a")} by ${recent.recordedBy.name}. Record another payment?`,
        }
      }
    }

    const amount = toCentavos(input.amount)
    const payment = await db.$transaction(async (tx) => {
      const row = await tx.contributionPayment.create({
        data: {
          memberId: member.id,
          amount,
          paidOn: dayToDate(input.paidOn),
          method: input.method,
          source: input.source,
          reference: input.reference || null,
          notes: input.notes || null,
          recordedById: viewer.id,
        },
      })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "contribution.record",
        entityType: "ContributionPayment",
        entityId: row.id,
        after: {
          member: fullName(member),
          trackingNumber: member.trackingNumber,
          amount: formatPeso(amount),
          paidOn: input.paidOn,
          method: input.method,
          source: input.source,
          reference: input.reference || undefined,
        },
      })
      return row
    })
    return { status: "recorded", paymentId: payment.id, amount, member: (await payMember(member.id))! }
  })

export const voidPayment = actionClient
  .metadata({ name: "voidPayment", permission: "contribution.void" })
  .inputSchema(voidPaymentSchema)
  .action(async ({ parsedInput: { id, reason }, ctx: { viewer } }) => {
    await db.$transaction(async (tx) => {
      const row = await tx.contributionPayment.findUnique({
        where: { id },
        include: {
          member: { select: { firstName: true, middleName: true, lastName: true, suffix: true, trackingNumber: true } },
        },
      })
      if (!row) throw new ActionError("That payment no longer exists.")
      if (row.voidedAt) throw new ActionError("That payment was already voided.")
      await tx.contributionPayment.update({
        where: { id },
        data: { voidedAt: new Date(), voidedById: viewer.id, voidReason: reason },
      })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "contribution.void",
        entityType: "ContributionPayment",
        entityId: id,
        before: {
          member: fullName(row.member),
          trackingNumber: row.member.trackingNumber,
          amount: formatPeso(row.amount),
          paidOn: dateToDay(row.paidOn),
          method: row.method,
        },
        metadata: { reason },
      })
    })
    return { ok: true }
  })

export const getCollectStatus = actionClient
  .metadata({ name: "getCollectStatus", permission: "contribution.collect" })
  .action(async ({ ctx: { viewer } }) => collectStatus(viewer.id))

export const saveContributionSchedule = actionClient
  .metadata({ name: "saveContributionSchedule", permission: "contribution.manage" })
  .inputSchema(scheduleSchema)
  .action(async ({ parsedInput, ctx: { viewer } }) => {
    await db.$transaction(async (tx) => {
      const before = await tx.setting.findUnique({ where: { key: SCHEDULE_SETTING_KEY } })
      if (JSON.stringify(before?.value) === JSON.stringify(parsedInput)) return
      await tx.setting.upsert({
        where: { key: SCHEDULE_SETTING_KEY },
        create: { key: SCHEDULE_SETTING_KEY, value: parsedInput, updatedBy: viewer.id },
        update: { value: parsedInput, updatedBy: viewer.id },
      })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "contribution.schedule_update",
        entityType: "Setting",
        entityId: SCHEDULE_SETTING_KEY,
        before: before?.value ?? null,
        after: parsedInput,
      })
    })
    return { ok: true }
  })
