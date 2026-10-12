"use server"

import { isValid, parse } from "date-fns"
import { z } from "zod"

import type { Prisma } from "@/generated/prisma/client"
import { getContributionSchedule, ledgerFor } from "@/features/contributions/queries"
import { dayToDate, formatDay, manilaToday } from "@/lib/dates"
import { db } from "@/lib/db"
import { fullName } from "@/lib/names"
import { signedUrls } from "@/lib/r2"
import { can } from "@/lib/rbac"
import { actionClient } from "@/lib/safe-action"

export type SearchMember = {
  id: string
  name: string
  trackingNumber: string
  blockLot: string
  thumbUrl: string | null
  isActive: boolean
  /** Centavos still owed (null when the viewer can't see contributions). */
  balance: number | null
}

export type SearchMeeting = { id: string; title: string; date: string; status: string }

// "4-12", "b4 l12", "blk 4 lot 12", "block 4" → block (and lot). Both parts must contain a digit,
// so two-word names like "juan cruz" are never mistaken for a block/lot.
const BLOCK_LOT = /^(?:b(?:lk|lock)?\.?\s*)?([a-z]?\d+[a-z]?)(?:\s*(?:[-/,]|\s|l(?:ot)?\.?)\s*([a-z]?\d+[a-z]?))?$/i
const BLOCK_ONLY_PREFIX = /^b(?:lk|lock)?\.?\s*\d/i

const DATE_FORMATS = ["yyyy-MM-dd", "M/d/yyyy", "M/d", "MMM d yyyy", "MMMM d yyyy", "MMM d", "MMMM d"]

function parseDay(q: string): string | null {
  const text = q.replace(/,/g, "").replace(/\s+/g, " ").trim()
  const ref = dayToDate(manilaToday())
  for (const f of DATE_FORMATS) {
    const d = parse(text, f, ref)
    if (isValid(d) && d.getFullYear() > 2000) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    }
  }
  return null
}

function memberWhere(q: string): Prisma.MemberWhereInput {
  const blockLot = q.match(BLOCK_LOT)
  const looksLikeBlock = blockLot && (blockLot[2] || BLOCK_ONLY_PREFIX.test(q))
  if (looksLikeBlock) {
    return {
      blockNumber: { equals: blockLot[1]!.toUpperCase() },
      ...(blockLot[2] ? { lotNumber: { equals: blockLot[2].toUpperCase() } } : {}),
    }
  }
  const words = q.split(/\s+/).filter(Boolean).slice(0, 5)
  return {
    AND: words.map((w) => {
      const digits = w.replace(/\D/g, "")
      return {
        OR: [
          { firstName: { contains: w, mode: "insensitive" as const } },
          { middleName: { contains: w, mode: "insensitive" as const } },
          { lastName: { contains: w, mode: "insensitive" as const } },
          { trackingNumber: { contains: w } },
          // Phones are stored as +639XXXXXXXXX; "0917 123…" → match the digits after the leading 0.
          ...(digits.length >= 4 ? [{ contactNumber: { contains: digits.replace(/^0/, "") } }] : []),
        ],
      }
    }),
  }
}

/** Ctrl K search: members (name, tracking no., Blk/Lot, phone) and meetings (title or date). */
export const globalSearch = actionClient
  .metadata({ name: "globalSearch" })
  .inputSchema(z.object({ q: z.string().trim().max(60) }))
  .action(async ({ parsedInput: { q }, ctx: { viewer } }) => {
    if (q.length < 2) return { members: [] as SearchMember[], meetings: [] as SearchMeeting[] }

    const [members, meetings] = await Promise.all([
      can(viewer, "member.view")
        ? db.member.findMany({
            where: memberWhere(q),
            orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
            take: 8,
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
          })
        : [],
      can(viewer, "meeting.view") ? searchMeetings(q) : [],
    ])

    let balances = new Map<string, number>()
    if (members.length && can(viewer, "contribution.view")) {
      const [schedule, paid] = await Promise.all([
        getContributionSchedule(),
        db.contributionPayment.groupBy({
          by: ["memberId"],
          where: { voidedAt: null, memberId: { in: members.map((m) => m.id) } },
          _sum: { amount: true },
        }),
      ])
      const paidBy = new Map(paid.map((p) => [p.memberId, p._sum.amount ?? 0]))
      balances = new Map(members.map((m) => [m.id, ledgerFor(schedule, m, paidBy.get(m.id) ?? 0).balance]))
    }
    const thumbs = await signedUrls(members.map((m) => m.photoThumbKey))

    return {
      members: members.map((m, i): SearchMember => ({
        id: m.id,
        name: fullName(m),
        trackingNumber: m.trackingNumber,
        blockLot: `Blk ${m.blockNumber} · Lot ${m.lotNumber}`,
        thumbUrl: thumbs[i] ?? null,
        isActive: m.isActive,
        balance: balances.has(m.id) ? balances.get(m.id)! : null,
      })),
      meetings,
    }
  })

async function searchMeetings(q: string): Promise<SearchMeeting[]> {
  const day = parseDay(q)
  const rows = await db.meeting.findMany({
    where: day ? { date: dayToDate(day) } : { title: { contains: q, mode: "insensitive" } },
    orderBy: { date: "desc" },
    take: 4,
    select: { id: true, title: true, date: true, status: true },
  })
  return rows.map((m) => ({
    id: m.id,
    title: m.title,
    date: formatDay(m.date, "EEE, MMM d, yyyy"),
    status: m.status === "OPEN" ? "Open" : m.status === "CLOSED" ? "Closed" : "Scheduled",
  }))
}
