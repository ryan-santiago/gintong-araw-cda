// One validated spreadsheet row, as shown in an import preview. Safe to import from client components.
export type ImportRow<Input = unknown> = {
  row: number // spreadsheet row number
  status: "ok" | "error" | "duplicate"
  name: string
  trackingNumber: string
  /** Extra summary shown in the preview, e.g. "₱1,000 · Mar 5, 2026 · Cash". */
  detail?: string
  errors: string[]
  warnings: string[]
  input?: Input
}

export type ImportSummary = { total: number; ok: number; errors: number; duplicates: number; warnings: number }

export function summarizeImport(rows: ImportRow[]): ImportSummary {
  return {
    total: rows.length,
    ok: rows.filter((r) => r.status === "ok").length,
    errors: rows.filter((r) => r.status === "error").length,
    duplicates: rows.filter((r) => r.status === "duplicate").length,
    warnings: rows.filter((r) => r.warnings.length).length,
  }
}
