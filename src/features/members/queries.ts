import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { db } from "@/lib/db"
import { signedUrl, signedUrls } from "@/lib/r2"
import { POSITION_VALUES, type MemberPositionValue } from "@/features/members/positions"

/** "OFFICERS" = every position except Member. */
const POSITION_FILTERS: string[] = ["OFFICERS", ...POSITION_VALUES]

export const MEMBER_PAGE_SIZE = 25

export const MEMBER_SORTS = {
  name: [{ lastName: "asc" }, { firstName: "asc" }],
  tracking: [{ trackingNumber: "asc" }],
  blocklot: [{ blockNumber: "asc" }, { lotNumber: "asc" }],
  position: [{ position: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
  newest: [{ createdAt: "desc" }],
} satisfies Record<string, Prisma.MemberOrderByWithRelationInput[]>

export type MemberSort = keyof typeof MEMBER_SORTS
export type MemberStatus = "active" | "inactive" | "all"

export type MemberFilters = {
  q: string
  status: MemberStatus
  block: string
  position: string
  /** Only members flagged "at risk" (missed N meetings in a row). */
  risk: boolean
  sort: MemberSort
  page: number
}

export function parseMemberFilters(params: Record<string, string | string[] | undefined>): MemberFilters {
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "")
  const status = str("status")
  const sort = str("sort")
  const page = Number.parseInt(str("page") || "1", 10)
  return {
    q: str("q").trim().slice(0, 100),
    status: status === "inactive" || status === "all" ? status : "active",
    block: str("block").trim().toUpperCase().slice(0, 10),
    position: POSITION_FILTERS.includes(str("position")) ? str("position") : "",
    risk: str("risk") === "1",
    sort: sort in MEMBER_SORTS ? (sort as MemberSort) : "name",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function memberWhere(
  filters: Pick<MemberFilters, "q" | "status" | "block" | "position">,
  onlyIds?: string[]
): Prisma.MemberWhereInput {
  // Every word must match some field, so "juan dela cruz" and "2026-0012" both work.
  const words = filters.q.split(/\s+/).filter(Boolean).slice(0, 6)
  return {
    ...(filters.status === "active" ? { isActive: true } : filters.status === "inactive" ? { isActive: false } : {}),
    ...(filters.block ? { blockNumber: filters.block } : {}),
    ...(onlyIds ? { id: { in: onlyIds } } : {}),
    ...(filters.position === "OFFICERS"
      ? { position: { not: "MEMBER" } }
      : filters.position
        ? { position: filters.position as MemberPositionValue }
        : {}),
    AND: words.map((w) => ({
      OR: [
        { firstName: { contains: w, mode: "insensitive" } },
        { middleName: { contains: w, mode: "insensitive" } },
        { lastName: { contains: w, mode: "insensitive" } },
        { trackingNumber: { contains: w } },
        { contactNumber: { contains: w.replace(/^0/, "") } },
      ],
    })),
  }
}

export async function listMembers(filters: MemberFilters, onlyIds?: string[]) {
  const where = memberWhere(filters, onlyIds)
  const [total, members, counts] = await Promise.all([
    db.member.count({ where }),
    db.member.findMany({
      where,
      orderBy: MEMBER_SORTS[filters.sort],
      skip: (filters.page - 1) * MEMBER_PAGE_SIZE,
      take: MEMBER_PAGE_SIZE,
      select: {
        id: true,
        trackingNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,
        position: true,
        blockNumber: true,
        lotNumber: true,
        contactNumber: true,
        barangayName: true,
        cityName: true,
        isActive: true,
        photoThumbKey: true,
      },
    }),
    db.member.groupBy({ by: ["isActive"], _count: { _all: true } }),
  ])
  const thumbs = await signedUrls(members.map((m) => m.photoThumbKey))
  return {
    total,
    members: members.map((m, i) => ({ ...m, thumbUrl: thumbs[i] })),
    counts: {
      active: counts.find((c) => c.isActive)?._count._all ?? 0,
      inactive: counts.find((c) => !c.isActive)?._count._all ?? 0,
    },
  }
}

export async function listBlocks() {
  const rows = await db.member.findMany({ distinct: ["blockNumber"], select: { blockNumber: true } })
  return rows.map((r) => r.blockNumber).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

export async function getMember(id: string) {
  const member = await db.member.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
    },
  })
  if (!member) return null
  const deletedBy = member.deletedById
    ? await db.user.findUnique({ where: { id: member.deletedById }, select: { name: true } })
    : null
  return {
    ...member,
    deletedByName: deletedBy?.name ?? null,
    photoUrl: member.photoKey ? await signedUrl(member.photoKey) : null,
  }
}

/** Next free tracking number for a year, e.g. "2026-0124". */
export async function nextTrackingNumber(year: number) {
  const latest = await db.member.findFirst({
    where: { trackingNumber: { startsWith: `${year}-` } },
    orderBy: { trackingNumber: "desc" },
    select: { trackingNumber: true },
  })
  const last = latest ? Number.parseInt(latest.trackingNumber.slice(5), 10) : 0
  return `${year}-${String(Math.min(last + 1, 9999)).padStart(4, "0")}`
}
