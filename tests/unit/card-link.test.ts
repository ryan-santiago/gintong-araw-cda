import { describe, expect, it, vi } from "vitest"

vi.mock("@/env", () => ({ env: { APP_URL: "https://gintongaraw.coderyan.dev/" } }))

const { cardUrl, generateCardToken, parseCardToken } = await import("@/lib/card-link")

describe("card links", () => {
  it("generates unique 22-char base64url tokens", () => {
    const a = generateCardToken()
    const b = generateCardToken()
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(a).not.toBe(b)
  })

  it("builds the card URL without a double slash", () => {
    expect(cardUrl("abcdefghijklmnopqrstuv")).toBe("https://gintongaraw.coderyan.dev/m/abcdefghijklmnopqrstuv")
  })

  it("parses a link from any host, a bare token, and surrounding whitespace", () => {
    const token = generateCardToken()
    expect(parseCardToken(`https://gintongaraw.coderyan.dev/m/${token}`)).toBe(token)
    expect(parseCardToken(`http://localhost:3000/m/${token}?x=1`)).toBe(token)
    expect(parseCardToken(`  ${token}\n`)).toBe(token)
  })

  it("rejects anything else", () => {
    expect(parseCardToken("2026-0001")).toBeNull()
    expect(parseCardToken('{"trackingNumber":"2026-0001"}')).toBeNull()
    expect(parseCardToken("https://x.dev/m/short")).toBeNull()
    expect(parseCardToken("https://x.dev/m/abcdefghijklmnopqrstuvwxyz")).toBeNull()
  })
})
