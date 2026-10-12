import {
  PAYMENT_IMPORT_MAX_ROWS,
  paymentImportTemplate,
  readPaymentFile,
  validatePaymentRows,
} from "@/features/contributions/import"
import { formatPeso } from "@/features/contributions/ledger"
import { apiViewer } from "@/lib/api"
import { writeAudit } from "@/lib/audit"
import { dayToDate } from "@/lib/dates"
import { db } from "@/lib/db"
import { summarizeImport } from "@/lib/import-types"

const MAX_BYTES = 4 * 1024 * 1024

/** GET → the Excel template for past payments. */
export async function GET() {
  const { error } = await apiViewer("contribution.manage")
  if (error) return error
  return new Response(new Uint8Array(await paymentImportTemplate()), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="gintong-araw-payment-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  })
}

/** POST multipart { file, commit }: preview, or (commit = "1") re-validate and insert the valid rows. */
export async function POST(request: Request) {
  const { viewer, error } = await apiViewer("contribution.manage")
  if (error) return error

  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return Response.json({ error: "Choose a file to import." }, { status: 400 })
  if (file.size > MAX_BYTES) return Response.json({ error: "The file is too large (max 4 MB)." }, { status: 413 })

  const read = await readPaymentFile(file)
  if ("error" in read) return Response.json({ error: read.error }, { status: 422 })

  const rows = await validatePaymentRows(read.rows)
  const summary = summarizeImport(rows)
  if (form?.get("commit") !== "1") {
    return Response.json({
      summary,
      rows: rows.map((r) => ({ ...r, input: undefined })),
      maxRows: PAYMENT_IMPORT_MAX_ROWS,
    })
  }

  const valid = rows.flatMap((r) => (r.status === "ok" && r.input ? [r.input] : []))
  if (!valid.length) return Response.json({ error: "There are no valid rows to import." }, { status: 422 })

  const total = valid.reduce((sum, p) => sum + p.amount, 0)
  const imported = await db.$transaction(
    async (tx) => {
      const result = await tx.contributionPayment.createMany({
        data: valid.map((p) => ({
          memberId: p.memberId,
          amount: p.amount,
          paidOn: dayToDate(p.paidOn),
          method: p.method,
          source: "IMPORT" as const,
          reference: p.reference,
          notes: p.notes,
          recordedById: viewer.id,
        })),
      })
      await writeAudit(tx, {
        actorId: viewer.id,
        action: "contribution.import",
        entityType: "ContributionPayment",
        metadata: {
          file: file.name,
          imported: result.count,
          skipped: summary.total - result.count,
          total: formatPeso(total),
        },
      })
      return result.count
    },
    { timeout: 30_000 }
  )

  return Response.json({ imported, skipped: summary.total - imported })
}
