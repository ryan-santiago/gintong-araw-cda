import { describe, expect, it } from "vitest"

import { fullName, memberInitials } from "@/lib/names"
import { formatPhone, normalizePhone } from "@/lib/phone"

describe("names", () => {
  it("shortens the middle name to an initial and keeps the suffix", () => {
    expect(fullName({ firstName: "Juan", middleName: "dela Paz", lastName: "Dela Cruz", suffix: "Jr." })).toBe(
      "Juan D. Dela Cruz Jr."
    )
  })

  it("skips empty parts", () => {
    expect(fullName({ firstName: " Maria ", middleName: " ", lastName: "Santos", suffix: null })).toBe("Maria Santos")
  })

  it("builds initials", () => {
    expect(memberInitials({ firstName: "juan", lastName: "cruz" })).toBe("JC")
    expect(memberInitials({ firstName: " ", lastName: "" })).toBe("?")
  })
})

describe("phone numbers", () => {
  it.each(["0917 123 4567", "+63 917 123 4567", "9171234567", "(0917) 123-4567"])("normalizes %s", (input) => {
    expect(normalizePhone(input)).toBe("+639171234567")
  })

  it("rejects invalid numbers", () => {
    expect(normalizePhone("12345")).toBeNull()
    expect(normalizePhone("")).toBeNull()
  })

  it("formats for display", () => {
    expect(formatPhone("+639171234567")).toBe("0917 123 4567")
    expect(formatPhone(null)).toBe("")
  })
})
