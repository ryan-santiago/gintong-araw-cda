"use server"

import { z } from "zod"

import { memberWhere, parseMemberFilters } from "@/features/members/queries"
import { writeAudit } from "@/lib/audit"
import { generateCardToken } from "@/lib/card-link"
import { db } from "@/lib/db"
import { fullName } from "@/lib/names"
import { ActionError } from "@/lib/rbac"
import { actionClient } from "@/lib/safe-action"

const MAX_BATCH = 100

/** Members (matching the list filters) that can get a card now, plus who was skipped and why. */
export const getIdCardBatch = actionClient
  .metadata({ name: "getIdCardBatch", permission: "member.generate_id" })
  .inputSchema(z.object({ params: z.record(z.string(), z.string()) }))
  .action(async ({ parsedInput: { params } }) => {
    const filters = parseMemberFilters(params)
    const where = { ...memberWhere(filters), isActive: true }
    const members = await db.member.findMany({
      where,
      orderBy: [{ blockNumber: "asc" }, { lotNumber: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,
        trackingNumber: true,
        photoKey: true,
      },
    })
    const ready = members.filter((m) => m.photoKey)
    return {
      members: ready
        .slice(0, MAX_BATCH)
        .map((m) => ({ id: m.id, name: fullName(m), trackingNumber: m.trackingNumber })),
      total: ready.length,
      withoutPhoto: members
        .filter((m) => !m.photoKey)
        .map((m) => ({ id: m.id, name: fullName(m), trackingNumber: m.trackingNumber })),
      limit: MAX_BATCH,
    }
  })

/** Cancels the current card (e.g. lost or stolen): its QR link stops working and a new one is issued. */
export const reissueCard = actionClient
  .metadata({ name: "reissueCard", permission: "member.generate_id" })
  .inputSchema(z.object({ memberId: z.string().min(1) }))
  .action(async ({ parsedInput: { memberId }, ctx: { viewer } }) => {
    await db.$transaction(async (tx) => {
      const member = await tx.member.findUnique({ where: { id: memberId }, select: { trackingNumber: true } })
      if (!member) throw new ActionError("That member no longer exists.")
      await tx.member.update({
        where: { id: memberId },
        data: { cardToken: generateCardToken(), cardTokenAt: new Date(), idGeneratedAt: null },
      })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "member.card_reissue",
        entityType: "Member",
        entityId: memberId,
        metadata: { trackingNumber: member.trackingNumber },
      })
    })
    return { ok: true }
  })
