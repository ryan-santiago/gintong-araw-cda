import "server-only"

import { resolveAddress } from "@/features/members/psgc"
import type { MemberInput } from "@/features/members/schema"
import { normalizePhone } from "@/lib/phone"

const day = (v: string) => (v ? new Date(`${v}T00:00:00.000Z`) : null)
const text = (v: string) => (v ? v : null)

/** Form/import input → database fields (normalized phone, dates, PSGC names). Null if the address codes are invalid. */
export async function toMemberRecord(input: MemberInput) {
  const address = await resolveAddress(input)
  if (!address) return null
  return {
    trackingNumber: input.trackingNumber,
    firstName: input.firstName,
    middleName: text(input.middleName),
    lastName: input.lastName,
    suffix: text(input.suffix),
    position: input.position,
    birthDate: day(input.birthDate),
    memberSince: day(input.memberSince),
    blockNumber: input.blockNumber,
    lotNumber: input.lotNumber,
    contactNumber: input.contactNumber ? normalizePhone(input.contactNumber) : null,
    email: text(input.email),
    addressLine: text(input.addressLine),
    zipCode: text(input.zipCode),
    ...address,
  }
}
