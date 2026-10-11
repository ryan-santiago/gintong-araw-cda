"use server"

import { meetingIdSchema, meetingSchema, meetingStatusSchema, type MeetingInput } from "@/features/meetings/schema"
import { getAppSettings } from "@/features/settings/queries"
import { diff, writeAudit } from "@/lib/audit"
import { dateToDay, dayToDate, formatManila, manilaDateTime, manilaToday } from "@/lib/dates"
import { db } from "@/lib/db"
import { ActionError } from "@/lib/rbac"
import { actionClient } from "@/lib/safe-action"

function toRecord(input: MeetingInput) {
  return {
    title: input.title,
    date: dayToDate(input.date),
    startTime: input.startTime ? manilaDateTime(input.date, input.startTime) : null,
    location: input.location || null,
    notes: input.notes || null,
  }
}

function auditView(m: ReturnType<typeof toRecord>) {
  return {
    title: m.title,
    date: dateToDay(m.date),
    startTime: m.startTime ? formatManila(m.startTime, "h:mm a") : null,
    location: m.location,
    notes: m.notes,
  }
}

export const saveMeeting = actionClient
  .metadata({ name: "saveMeeting", permission: "meeting.manage" })
  .inputSchema(meetingSchema)
  .action(async ({ parsedInput: { id, ...input }, ctx: { viewer } }) => {
    const record = toRecord(input)
    return db.$transaction(async (tx) => {
      if (id) {
        const existing = await tx.meeting.findUnique({ where: { id } })
        if (!existing) throw new ActionError("That meeting no longer exists.")
        await tx.meeting.update({ where: { id }, data: record })
        const changes = diff(auditView(existing), auditView(record))
        if (changes.changed) {
          await writeAudit(tx, {
            actorId: viewer.id,
            action: "meeting.update",
            entityType: "Meeting",
            entityId: id,
            before: changes.before,
            after: changes.after,
          })
        }
        return { id }
      }
      const meeting = await tx.meeting.create({ data: { ...record, createdById: viewer.id } })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "meeting.create",
        entityType: "Meeting",
        entityId: meeting.id,
        after: auditView(record),
      })
      return { id: meeting.id }
    })
  })

export const setMeetingStatus = actionClient
  .metadata({ name: "setMeetingStatus", permission: "meeting.manage" })
  .inputSchema(meetingStatusSchema)
  .action(async ({ parsedInput: { id, status }, ctx: { viewer } }) => {
    await db.$transaction(async (tx) => {
      const meeting = await tx.meeting.findUnique({ where: { id } })
      if (!meeting) throw new ActionError("That meeting no longer exists.")
      if (meeting.status === status) return
      await tx.meeting.update({
        where: { id },
        data: status === "OPEN" ? { status, openedAt: new Date() } : { status, closedAt: new Date() },
      })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: status === "OPEN" ? "meeting.open" : "meeting.close",
        entityType: "Meeting",
        entityId: id,
        before: { status: meeting.status },
        after: { status },
        metadata: { title: meeting.title, date: dateToDay(meeting.date) },
      })
    })
    return { ok: true }
  })

export const deleteMeeting = actionClient
  .metadata({ name: "deleteMeeting", permission: "meeting.manage" })
  .inputSchema(meetingIdSchema)
  .action(async ({ parsedInput: { id }, ctx: { viewer } }) => {
    await db.$transaction(async (tx) => {
      const meeting = await tx.meeting.findUnique({
        where: { id },
        include: { _count: { select: { attendances: true } } },
      })
      if (!meeting) throw new ActionError("That meeting no longer exists.")
      if (meeting._count.attendances > 0) {
        throw new ActionError("This meeting already has attendance records. Remove them first, or keep the meeting.")
      }
      await tx.meeting.delete({ where: { id } })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "meeting.delete",
        entityType: "Meeting",
        entityId: id,
        before: { title: meeting.title, date: dateToDay(meeting.date), status: meeting.status },
      })
    })
    return { ok: true }
  })

/** Meeting-day shortcut on the capture screen: create today's meeting and open it. */
export const startMeetingToday = actionClient
  .metadata({ name: "startMeetingToday", permission: "meeting.manage" })
  .inputSchema(meetingIdSchema.pick({}))
  .action(async ({ ctx: { viewer } }) => {
    const today = manilaToday()
    const settings = await getAppSettings()
    return db.$transaction(async (tx) => {
      const existing = await tx.meeting.findFirst({ where: { date: dayToDate(today), status: { not: "CLOSED" } } })
      const meeting = existing
        ? await tx.meeting.update({ where: { id: existing.id }, data: { status: "OPEN", openedAt: new Date() } })
        : await tx.meeting.create({
            data: {
              title: settings.meetingTitle,
              date: dayToDate(today),
              startTime: settings.meetingTime ? manilaDateTime(today, settings.meetingTime) : null,
              location: settings.meetingLocation || null,
              status: "OPEN",
              openedAt: new Date(),
              createdById: viewer.id,
            },
          })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "meeting.open",
        entityType: "Meeting",
        entityId: meeting.id,
        after: { status: "OPEN" },
        metadata: { title: meeting.title, date: today, createdNow: !existing },
      })
      return { id: meeting.id }
    })
  })
