import "server-only"

import type { CardData } from "@/features/id-card/render"
import { positionLabel } from "@/features/members/positions"
import { db } from "@/lib/db"
import { fullName } from "@/lib/names"
import { cardUrl, generateCardToken } from "@/lib/card-link"
import { getObjectBytes } from "@/lib/r2"

export type CardMember = { id: string; name: string; trackingNumber: string; lastName: string }

/** Loads everything printed on a member's card, or explains why a card can't be made. */
export async function loadCardData(
  id: string
): Promise<{ member: CardMember; data: CardData } | { error: string; status: number }> {
  const m = await db.member.findUnique({ where: { id } })
  if (!m) return { error: "Member not found.", status: 404 }
  if (!m.isActive) return { error: "This member is inactive. Restore them before issuing an ID.", status: 409 }
  if (!m.photoKey) return { error: "Add a photo before generating the ID card.", status: 409 }

  const token = m.cardToken ?? (await ensureCardToken(m.id))
  const name = fullName(m)
  return {
    member: { id: m.id, name, trackingNumber: m.trackingNumber, lastName: m.lastName },
    data: {
      fullName: name,
      position: positionLabel(m.position),
      trackingNumber: m.trackingNumber,
      blockLot: `Block ${m.blockNumber} Lot ${m.lotNumber}`,
      qrText: cardUrl(token),
      photo: await getObjectBytes(m.photoKey),
    },
  }
}

/** Members created before card links existed get their token on first use. */
export async function ensureCardToken(memberId: string) {
  const token = generateCardToken()
  const updated = await db.member.updateMany({
    where: { id: memberId, cardToken: null },
    data: { cardToken: token, cardTokenAt: new Date() },
  })
  if (updated.count) return token
  const existing = await db.member.findUniqueOrThrow({ where: { id: memberId }, select: { cardToken: true } })
  return existing.cardToken!
}

export function cardFileName(member: CardMember, suffix: string, ext: string) {
  const last = member.lastName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .toUpperCase()
  return `GA-${member.trackingNumber}_${last}_${suffix}.${ext}`
}
