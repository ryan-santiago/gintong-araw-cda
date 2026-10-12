import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({ db: {} }))

const { importTemplate, readImportFile } = await import("@/features/members/import")

const csv = (text: string) => new File([text], "members.csv", { type: "text/csv" })

describe("member import file reading", () => {
  it("reads back its own template", async () => {
    const buffer = await importTemplate()
    const read = await readImportFile(new File([new Uint8Array(buffer)], "template.xlsx"))
    if ("error" in read) throw new Error(read.error)
    expect(read.rows).toHaveLength(1)
    expect(read.rows[0]).toMatchObject({ trackingNumber: expect.stringMatching(/^\d{4}-\d{4}$/) })
  })

  it("maps header aliases case-insensitively and skips blank rows", async () => {
    const read = await readImportFile(
      csv(
        "Tracking Number,LAST NAME,First Name,Block,Lot\n2026-0001,Cruz,Juan,3,12\n,,,,\n2026-0002,Santos,Maria,4,1\n"
      )
    )
    if ("error" in read) throw new Error(read.error)
    expect(read.rows).toHaveLength(2)
    expect(read.rows[1]).toMatchObject({ trackingNumber: "2026-0002", lastName: "Santos", blockNumber: "4" })
  })

  it("keeps CSV dates as written in a UTC+8 timezone", async () => {
    const tz = process.env.TZ
    process.env.TZ = "Asia/Manila" // the bug only shows east of UTC
    try {
      const read = await readImportFile(
        csv("Tracking No.,Last Name,First Name,Block,Lot,Member Since\n2026-0001,Cruz,Juan,3,12,2026-01-01\n")
      )
      if ("error" in read) throw new Error(read.error)
      expect(read.rows[0]).toMatchObject({ memberSince: "2026-01-01", lotNumber: "12" })
    } finally {
      process.env.TZ = tz
    }
  })

  it("rejects a file without the required columns", async () => {
    const read = await readImportFile(csv("Name,Address\nJuan,Somewhere\n"))
    expect(read).toHaveProperty("error")
  })
})
