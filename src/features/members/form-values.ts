import type { MemberPositionValue } from "@/features/members/positions"
import type { MemberInput } from "@/features/members/schema"
import { formatPhone } from "@/lib/phone"

type StoredMember = {
  firstName: string
  middleName: string | null
  lastName: string
  suffix: string | null
  position: MemberPositionValue
  birthDate: Date | null
  memberSince: Date | null
  trackingNumber: string
  blockNumber: string
  lotNumber: string
  contactNumber: string | null
  email: string | null
  addressLine: string | null
  regionCode: string | null
  provinceCode: string | null
  cityCode: string | null
  barangayCode: string | null
  zipCode: string | null
}

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "")

export function toFormValues(m: StoredMember): MemberInput {
  return {
    firstName: m.firstName,
    middleName: m.middleName ?? "",
    lastName: m.lastName,
    suffix: m.suffix ?? "",
    position: m.position,
    birthDate: iso(m.birthDate),
    memberSince: iso(m.memberSince),
    trackingNumber: m.trackingNumber,
    blockNumber: m.blockNumber,
    lotNumber: m.lotNumber,
    contactNumber: formatPhone(m.contactNumber),
    email: m.email ?? "",
    addressLine: m.addressLine ?? "",
    regionCode: m.regionCode ?? "",
    // A city without a province (e.g. Isabela City) sits under "Independent cities".
    provinceCode: m.provinceCode ?? (m.cityCode ? "none" : ""),
    cityCode: m.cityCode ?? "",
    barangayCode: m.barangayCode ?? "",
    zipCode: m.zipCode ?? "",
  }
}
