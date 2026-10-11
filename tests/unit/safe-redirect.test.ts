import { describe, expect, it } from "vitest"

import { safeRedirectPath } from "@/lib/safe-redirect"

describe("safeRedirectPath", () => {
  it("keeps same-site paths with query and hash", () => {
    expect(safeRedirectPath("/members?q=juan#top")).toBe("/members?q=juan#top")
    expect(safeRedirectPath("/meetings/abc/attendance")).toBe("/meetings/abc/attendance")
  })

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "members",
    "",
    null,
    undefined,
  ])("falls back for %s", (value) => {
    expect(safeRedirectPath(value)).toBe("/dashboard")
  })

  it("uses the given fallback", () => {
    expect(safeRedirectPath("//x", "/login")).toBe("/login")
  })
})
