import { describe, expect, it, vi } from "vitest"

// rbac.ts also exports session helpers; stub their server dependencies so the pure checks can be tested.
vi.mock("@/lib/auth", () => ({ auth: {} }))
vi.mock("@/lib/db", () => ({ db: {} }))
vi.mock("next/headers", () => ({ headers: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

const { can, outranks } = await import("@/lib/rbac")

describe("permissions", () => {
  it("checks the effective permission list", () => {
    const viewer = { permissions: ["member.view" as const] }
    expect(can(viewer, "member.view")).toBe(true)
    expect(can(viewer, "member.deactivate")).toBe(false)
  })

  it("only lets a strictly better (lower) rank manage a group", () => {
    expect(outranks({ rank: 10, isSuperAdmin: false }, 20)).toBe(true)
    expect(outranks({ rank: 20, isSuperAdmin: false }, 20)).toBe(false)
    expect(outranks({ rank: 30, isSuperAdmin: false }, 20)).toBe(false)
    expect(outranks({ rank: Infinity, isSuperAdmin: false }, 100)).toBe(false)
    expect(outranks({ rank: 50, isSuperAdmin: true }, 0)).toBe(true)
  })
})
