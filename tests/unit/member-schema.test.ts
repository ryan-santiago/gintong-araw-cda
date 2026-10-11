import { describe, expect, it } from "vitest"

import { emptyMember, memberSchema } from "@/features/members/schema"

const base = {
  ...emptyMember,
  firstName: "Juan",
  lastName: "Cruz",
  trackingNumber: "2026-0001",
  blockNumber: "3a",
  lotNumber: "12",
}
const issues = (input: object) => {
  const result = memberSchema.safeParse({ ...base, ...input })
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."))
}

describe("memberSchema", () => {
  it("accepts the required fields only, and uppercases block/lot", () => {
    expect(memberSchema.parse(base).blockNumber).toBe("3A")
  })

  it("requires names, block and lot", () => {
    expect(issues({ firstName: " ", lastName: "", blockNumber: "", lotNumber: "" })).toEqual(
      expect.arrayContaining(["firstName", "lastName", "blockNumber", "lotNumber"])
    )
  })

  it.each(["2026-1", "26-0001", "2026/0001", "20260001"])("rejects tracking number %s", (trackingNumber) => {
    expect(issues({ trackingNumber })).toEqual(["trackingNumber"])
  })

  it("validates optional phone, email, ZIP and dates", () => {
    expect(issues({ contactNumber: "0917 123 4567", email: "A@B.PH", birthDate: "1980-05-01" })).toEqual([])
    expect(issues({ contactNumber: "123" })).toEqual(["contactNumber"])
    expect(issues({ email: "not-an-email" })).toEqual(["email"])
    expect(issues({ zipCode: "110", regionCode: "13", cityCode: "1", barangayCode: "2" })).toEqual(["zipCode"])
    expect(issues({ birthDate: "3000-01-01" })).toEqual(["birthDate"])
    expect(issues({ memberSince: "1899-12-31" })).toEqual(["memberSince"])
  })

  it("needs region, city and barangay once any address field is filled", () => {
    expect(issues({ addressLine: "Phase 2" })).toEqual(["regionCode", "cityCode", "barangayCode"])
    expect(issues({ addressLine: "Phase 2", regionCode: "13", cityCode: "1", barangayCode: "2" })).toEqual([])
  })
})
