"use server"

import { z } from "zod"

import { positionLabel } from "@/features/members/positions"
import { nextTrackingNumber } from "@/features/members/queries"
import { toMemberRecord } from "@/features/members/record"
import { blockLotSchema, memberIdSchema, memberSchema, type MemberInput } from "@/features/members/schema"
import { diff, writeAudit } from "@/lib/audit"
import { generateCardToken } from "@/lib/card-link"
import { db } from "@/lib/db"
import { fullName } from "@/lib/names"
import { ActionError } from "@/lib/rbac"
import { actionClient } from "@/lib/safe-action"

async function toRecord(input: MemberInput) {
  const record = await toMemberRecord(input)
  if (!record) throw new ActionError("The selected address is no longer valid. Please choose it again.")
  return record
}

type AuditSource = {
  trackingNumber: string
  firstName: string
  middleName: string | null
  lastName: string
  suffix: string | null
  position: string
  birthDate: Date | null
  memberSince: Date | null
  blockNumber: string
  lotNumber: string
  contactNumber: string | null
  email: string | null
  addressLine: string | null
  barangayName: string | null
  cityName: string | null
  provinceName: string | null
  regionName: string | null
  zipCode: string | null
}

// What the audit log shows: readable values, no PSGC codes.
function auditView(r: AuditSource) {
  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)
  return {
    trackingNumber: r.trackingNumber,
    firstName: r.firstName,
    middleName: r.middleName,
    lastName: r.lastName,
    suffix: r.suffix,
    position: positionLabel(r.position),
    birthDate: iso(r.birthDate),
    memberSince: iso(r.memberSince),
    blockNumber: r.blockNumber,
    lotNumber: r.lotNumber,
    contactNumber: r.contactNumber,
    email: r.email,
    address:
      [r.addressLine, r.barangayName, r.cityName, r.provinceName, r.regionName, r.zipCode].filter(Boolean).join(", ") ||
      null,
  }
}

async function assertTrackingFree(trackingNumber: string, excludeId?: string) {
  const taken = await db.member.findFirst({
    where: { trackingNumber, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { firstName: true, lastName: true, middleName: true, suffix: true },
  })
  if (taken) throw new ActionError(`Tracking number ${trackingNumber} is already used by ${fullName(taken)}.`)
}

export const createMember = actionClient
  .metadata({ name: "createMember", permission: "member.create" })
  .inputSchema(memberSchema)
  .action(async ({ parsedInput, ctx: { viewer } }) => {
    await assertTrackingFree(parsedInput.trackingNumber)
    const record = await toRecord(parsedInput)

    return db.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          ...record,
          cardToken: generateCardToken(),
          cardTokenAt: new Date(),
          createdById: viewer.id,
          updatedById: viewer.id,
        },
      })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "member.create",
        entityType: "Member",
        entityId: member.id,
        after: auditView(record),
      })
      return { id: member.id }
    })
  })

export const updateMember = actionClient
  .metadata({ name: "updateMember", permission: "member.update" })
  .inputSchema(memberSchema.and(memberIdSchema))
  .action(async ({ parsedInput: { id, ...input }, ctx: { viewer } }) => {
    await assertTrackingFree(input.trackingNumber, id)
    const record = await toRecord(input)

    return db.$transaction(async (tx) => {
      const existing = await tx.member.findUnique({ where: { id } })
      if (!existing) throw new ActionError("That member no longer exists.")

      const changes = diff(auditView(existing), auditView(record))
      await tx.member.update({ where: { id }, data: { ...record, updatedById: viewer.id } })
      if (changes.changed) {
        await writeAudit(tx, {
          actorId: viewer.id,
          action: "member.update",
          entityType: "Member",
          entityId: id,
          before: changes.before,
          after: changes.after,
        })
      }
      return { id }
    })
  })

export const deactivateMember = actionClient
  .metadata({ name: "deactivateMember", permission: "member.deactivate" })
  .inputSchema(memberIdSchema)
  .action(async ({ parsedInput: { id }, ctx: { viewer } }) => {
    await db.$transaction(async (tx) => {
      const member = await tx.member.findUnique({ where: { id } })
      if (!member) throw new ActionError("That member no longer exists.")
      if (!member.isActive) return
      await tx.member.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date(), deletedById: viewer.id, updatedById: viewer.id },
      })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "member.deactivate",
        entityType: "Member",
        entityId: id,
        before: { isActive: true },
        after: { isActive: false },
        metadata: { name: fullName(member), trackingNumber: member.trackingNumber },
      })
    })
    return { ok: true }
  })

export const restoreMember = actionClient
  .metadata({ name: "restoreMember", permission: "member.restore" })
  .inputSchema(memberIdSchema)
  .action(async ({ parsedInput: { id }, ctx: { viewer } }) => {
    await db.$transaction(async (tx) => {
      const member = await tx.member.findUnique({ where: { id } })
      if (!member) throw new ActionError("That member no longer exists.")
      if (member.isActive) return
      await tx.member.update({
        where: { id },
        data: { isActive: true, deletedAt: null, deletedById: null, updatedById: viewer.id },
      })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "member.restore",
        entityType: "Member",
        entityId: id,
        before: { isActive: false },
        after: { isActive: true },
        metadata: { name: fullName(member), trackingNumber: member.trackingNumber },
      })
    })
    return { ok: true }
  })

export const suggestTrackingNumber = actionClient
  .metadata({ name: "suggestTrackingNumber", permission: "member.create" })
  .inputSchema(z.object({}))
  .action(async () => {
    const year = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Manila", year: "numeric" }).format(new Date()))
    return { trackingNumber: await nextTrackingNumber(year) }
  })

/** Other members on the same block and lot (a warning, not an error). */
export const findBlockLotConflicts = actionClient
  .metadata({ name: "findBlockLotConflicts", permission: "member.view" })
  .inputSchema(blockLotSchema)
  .action(async ({ parsedInput: { blockNumber, lotNumber, excludeId } }) => {
    if (!blockNumber || !lotNumber) return { members: [] }
    const members = await db.member.findMany({
      where: {
        blockNumber: blockNumber.toUpperCase(),
        lotNumber: lotNumber.toUpperCase(),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, firstName: true, middleName: true, lastName: true, suffix: true, isActive: true },
      take: 5,
    })
    return { members: members.map((m) => ({ id: m.id, name: fullName(m), isActive: m.isActive })) }
  })
