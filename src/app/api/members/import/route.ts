import { IMPORT_MAX_ROWS, importTemplate, readImportFile, validateImportRows } from "@/features/members/import"
import { toMemberRecord } from "@/features/members/record"
import { apiViewer } from "@/lib/api"
import { writeAudit } from "@/lib/audit"
import { generateCardToken } from "@/lib/card-link"
import { summarizeImport } from "@/lib/import-types"
import { db } from "@/lib/db"

const MAX_BYTES = 2 * 1024 * 1024

/** GET → the Excel import template. */
export async function GET() {
  const { error } = await apiViewer("member.create")
  if (error) return error
  return new Response(new Uint8Array(await importTemplate()), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="gintong-araw-member-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  })
}

/**
 * POST multipart { file, commit }.
 * commit != "1" → validation preview only. commit = "1" → re-validates and inserts the valid rows.
 */
export async function POST(request: Request) {
  const { viewer, error } = await apiViewer("member.create")
  if (error) return error

  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return Response.json({ error: "Choose a file to import." }, { status: 400 })
  if (file.size > MAX_BYTES) return Response.json({ error: "The file is too large (max 2 MB)." }, { status: 413 })

  const read = await readImportFile(file)
  if ("error" in read) return Response.json({ error: read.error }, { status: 422 })

  const rows = await validateImportRows(read.rows)
  const summary = summarizeImport(rows)
  if (form?.get("commit") !== "1") {
    const view = rows.map((r) => ({ ...r, input: undefined }))
    return Response.json({ summary, rows: view, maxRows: IMPORT_MAX_ROWS })
  }

  // Commit: build records first (outside the transaction), then insert in one transaction.
  const records: NonNullable<Awaited<ReturnType<typeof toMemberRecord>>>[] = []
  for (const r of rows) {
    if (r.status !== "ok" || !r.input) continue
    const record = await toMemberRecord(r.input)
    if (record) records.push(record)
  }
  if (!records.length) return Response.json({ error: "There are no valid rows to import." }, { status: 422 })

  const now = new Date()
  const created = await db.$transaction(
    async (tx) => {
      const result = await tx.member.createMany({
        data: records.map((record) => ({
          ...record,
          cardToken: generateCardToken(),
          cardTokenAt: now,
          createdById: viewer.id,
          updatedById: viewer.id,
        })),
        skipDuplicates: true, // a tracking number taken between preview and import is skipped, not an error
      })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "member.import",
        entityType: "Member",
        metadata: {
          file: file.name,
          imported: result.count,
          skipped: summary.total - result.count,
          trackingNumbers: records.slice(0, 50).map((r) => r.trackingNumber),
        },
      })
      return result.count
    },
    { timeout: 30_000 }
  )

  return Response.json({ imported: created, skipped: summary.total - created })
}
