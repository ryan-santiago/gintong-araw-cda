"use server"

import { z } from "zod"

import { Prisma } from "@/generated/prisma/client"
import { captureStatus } from "@/features/attendance/queries"
import { positionLabel } from "@/features/members/positions"
import { writeAudit } from "@/lib/audit"
import { parseCardToken } from "@/lib/card-link"
import { dateToDay } from "@/lib/dates"
import { db } from "@/lib/db"
import { fullName } from "@/lib/names"
import { signedUrl, signedUrls } from "@/lib/r2"
import { ActionError, type Viewer } from "@/lib/rbac"
import { actionClient } from "@/lib/safe-action"

export type CapturedMember = {
  id: string
  name: string
  trackingNumber: string
  blockLot: string
  position: string
  thumbUrl: string | null
}

export type CaptureResult =
  | { status: "recorded" | "duplicate"; member: CapturedMember; checkedInAt: string; present: number }
  | { status: "invalid" | "inactive" | "closed"; message: string; member?: CapturedMember }

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
  isActive: true,
} as const

type SelectedMember = Prisma.MemberGetPayload<{ select: typeof memberSelect }>

async function toCaptured(m: SelectedMember): Promise<CapturedMember> {
  return {
    id: m.id,
    name: fullName(m),
    trackingNumber: m.trackingNumber,
    blockLot: `Blk ${m.blockNumber} · Lot ${m.lotNumber}`,
    position: positionLabel(m.position),
    thumbUrl: m.photoThumbKey ? await signedUrl(m.photoThumbKey) : null,
  }
}

async function record(
  meetingId: string,
  m: SelectedMember,
  method: "QR" | "MANUAL",
  viewer: Viewer
): Promise<CaptureResult> {
  const meeting = await db.meeting.findUnique({ where: { id: meetingId }, select: { status: true, date: true } })
  if (!meeting) throw new ActionError("That meeting no longer exists.")
  const member = await toCaptured(m)
  if (meeting.status !== "OPEN") {
    return { status: "closed", message: "This meeting isn't open. Open it to capture attendance.", member }
  }
  if (!m.isActive) return { status: "inactive", message: "This member is inactive.", member }

  try {
    const created = await db.$transaction(async (tx) => {
      const row = await tx.attendance.create({
        data: { meetingId, memberId: m.id, method, recordedById: viewer.id },
      })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "attendance.capture",
        entityType: "Attendance",
        entityId: row.id,
        metadata: { meetingDate: dateToDay(meeting.date), trackingNumber: m.trackingNumber, method },
      })
      return row
    })
    const present = await db.attendance.count({ where: { meetingId } })
    return { status: "recorded", member, checkedInAt: created.checkedInAt.toISOString(), present }
  } catch (error) {
    // Another phone (or a double scan) already recorded this member for this meeting.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.attendance.findUniqueOrThrow({
        where: { meetingId_memberId: { meetingId, memberId: m.id } },
      })
      const present = await db.attendance.count({ where: { meetingId } })
      return { status: "duplicate", member, checkedInAt: existing.checkedInAt.toISOString(), present }
    }
    throw error
  }
}

export const recordAttendanceByCard = actionClient
  .metadata({ name: "recordAttendanceByCard", permission: "attendance.capture" })
  .inputSchema(z.object({ meetingId: z.string().min(1), text: z.string().max(500) }))
  .action(async ({ parsedInput: { meetingId, text }, ctx: { viewer } }): Promise<CaptureResult> => {
    const token = parseCardToken(text)
    if (!token) return { status: "invalid", message: "Not a Gintong Araw member ID." }
    const m = await db.member.findUnique({ where: { cardToken: token }, select: memberSelect })
    if (!m) return { status: "invalid", message: "Unknown or cancelled ID card. It may have been reissued." }
    return record(meetingId, m, "QR", viewer)
  })

export const recordAttendanceManual = actionClient
  .metadata({ name: "recordAttendanceManual", permission: "attendance.capture" })
  .inputSchema(z.object({ meetingId: z.string().min(1), memberId: z.string().min(1) }))
  .action(async ({ parsedInput: { meetingId, memberId }, ctx: { viewer } }): Promise<CaptureResult> => {
    const m = await db.member.findUnique({ where: { id: memberId }, select: memberSelect })
    if (!m) throw new ActionError("That member no longer exists.")
    return record(meetingId, m, "MANUAL", viewer)
  })

/** Live search for manual check-in: tracking number or name; flags who is already present. */
export const searchMembersForCapture = actionClient
  .metadata({ name: "searchMembersForCapture", permission: "attendance.capture" })
  .inputSchema(z.object({ meetingId: z.string().min(1), q: z.string().trim().max(60) }))
  .action(async ({ parsedInput: { meetingId, q } }) => {
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
      select: { ...memberSelect, attendances: { where: { meetingId }, select: { checkedInAt: true } } },
    })
    const thumbs = await signedUrls(members.map((m) => m.photoThumbKey))
    return {
      members: members.map((m, i) => ({
        id: m.id,
        name: fullName(m),
        trackingNumber: m.trackingNumber,
        blockLot: `Blk ${m.blockNumber} · Lot ${m.lotNumber}`,
        thumbUrl: thumbs[i] ?? null,
        presentAt: m.attendances[0]?.checkedInAt.toISOString() ?? null,
      })),
    }
  })

/** Count + latest check-ins for the capture screen (polled so several phones stay in sync). */
export const getCaptureStatus = actionClient
  .metadata({ name: "getCaptureStatus", permission: "attendance.capture" })
  .inputSchema(z.object({ meetingId: z.string().min(1) }))
  .action(async ({ parsedInput: { meetingId } }) => captureStatus(meetingId))

export const removeAttendance = actionClient
  .metadata({ name: "removeAttendance", permission: "attendance.delete" })
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput: { id }, ctx: { viewer } }) => {
    await db.$transaction(async (tx) => {
      const row = await tx.attendance.findUnique({
        where: { id },
        include: {
          meeting: { select: { date: true, title: true } },
          member: { select: { firstName: true, middleName: true, lastName: true, suffix: true, trackingNumber: true } },
        },
      })
      if (!row) throw new ActionError("That record was already removed.")
      await tx.attendance.delete({ where: { id } })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "attendance.delete",
        entityType: "Attendance",
        entityId: id,
        before: {
          member: fullName(row.member),
          trackingNumber: row.member.trackingNumber,
          meeting: `${row.meeting.title} (${dateToDay(row.meeting.date)})`,
          checkedInAt: row.checkedInAt.toISOString(),
          method: row.method,
        },
      })
    })
    return { ok: true }
  })
