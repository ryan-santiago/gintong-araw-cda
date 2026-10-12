"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ImportRow, ImportSummary } from "@/lib/import-types"
import { cn } from "@/lib/utils"

type Preview = { summary: ImportSummary; rows: ImportRow[] }
type Filter = "all" | "ok" | "issues"

async function send(endpoint: string, file: File, commit: boolean) {
  const body = new FormData()
  body.set("file", file)
  if (commit) body.set("commit", "1")
  const res = await fetch(endpoint, { method: "POST", body })
  const data = await res.json().catch(() => ({ error: "Something went wrong. Please try again." }))
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.")
  return data
}

/**
 * Upload → validation preview → import. The endpoint answers GET with the template, and POST (multipart
 * `file`, plus `commit=1` to save) with `{ summary, rows }` or `{ imported, skipped }`.
 */
export function ImportWizard({
  endpoint,
  noun,
  intro,
  doneHref,
}: {
  endpoint: string
  noun: { one: string; many: string }
  intro: React.ReactNode
  doneHref: string
}) {
  const plural = (n: number) => (n === 1 ? noun.one : noun.many)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  const [busy, setBusy] = useState<"check" | "import" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function check(next: File) {
    setFile(next)
    setPreview(null)
    setError(null)
    setFilter("all")
    setBusy("check")
    try {
      setPreview(await send(endpoint, next, false))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function runImport() {
    if (!file) return
    setBusy("import")
    try {
      const { imported, skipped } = await send(endpoint, file, true)
      toast.success(`Imported ${imported} ${plural(imported)}`, {
        description: skipped ? `${skipped} row${skipped === 1 ? " was" : "s were"} skipped.` : undefined,
      })
      router.push(doneHref)
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
      setBusy(null)
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const rows =
    preview?.rows.filter((r) => (filter === "all" ? true : filter === "ok" ? r.status === "ok" : r.status !== "ok")) ??
    []

  return (
    <div className="grid gap-6">
      <Card className="gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="font-semibold">1. Fill in the template</p>
            <p className="text-sm text-muted-foreground">{intro}</p>
          </div>
          <Button asChild variant="outline">
            <a href={endpoint} download>
              <Download /> Download template
            </a>
          </Button>
        </div>

        <div className="grid gap-3">
          <p className="font-semibold">2. Upload the file</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="sr-only"
            onChange={(e) => {
              const next = e.target.files?.[0]
              if (next) void check(next)
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const next = e.dataTransfer.files?.[0]
              if (next) void check(next)
            }}
            disabled={busy !== null}
            className="grid justify-items-center gap-2 rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center transition-colors outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
          >
            {busy === "check" ? (
              <Loader2 className="size-7 animate-spin text-muted-foreground" />
            ) : (
              <FileSpreadsheet className="size-7 text-muted-foreground" />
            )}
            <span className="font-semibold">
              {busy === "check" ? "Checking…" : file ? file.name : "Choose an Excel or CSV file"}
            </span>
            <span className="text-sm text-muted-foreground">
              {file ? "Click to choose a different file" : ".xlsx or .csv, up to 1,000 rows · or drop it here"}
            </span>
          </button>
          {error && (
            <p role="alert" className="flex items-center gap-2 text-sm font-medium text-destructive">
              <XCircle className="size-4 shrink-0" /> {error}
            </p>
          )}
        </div>
      </Card>

      {preview && (
        <Card className="gap-0 py-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
            <div className="grid gap-1">
              <p className="font-semibold">3. Review and import</p>
              <p className="text-sm text-muted-foreground">
                {preview.summary.ok} ready · {preview.summary.duplicates} already exist · {preview.summary.errors} with
                errors
                {preview.summary.warnings > 0 && ` · ${preview.summary.warnings} with notes`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={reset} disabled={busy !== null}>
                Cancel
              </Button>
              <Button onClick={runImport} disabled={busy !== null || preview.summary.ok === 0}>
                {busy === "import" ? <Loader2 className="animate-spin" /> : <Upload />}
                Import {preview.summary.ok} {plural(preview.summary.ok)}
              </Button>
            </div>
          </div>

          <div className="flex gap-1 border-b px-5 py-2">
            {(
              [
                ["all", `All (${preview.summary.total})`],
                ["ok", `Ready (${preview.summary.ok})`],
                ["issues", `Skipped (${preview.summary.total - preview.summary.ok})`],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "secondary" : "ghost"}
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No rows to show.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 pl-5">Row</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead className="hidden sm:table-cell">Tracking no.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden pr-5 md:table-cell">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.row} className="align-top">
                    <TableCell className="pl-5 text-muted-foreground tabular-nums">{r.row}</TableCell>
                    <TableCell className="font-medium whitespace-normal">
                      {r.name || <span className="text-muted-foreground">—</span>}
                      {r.detail && <p className="text-xs font-normal text-muted-foreground">{r.detail}</p>}
                      <Notes row={r} className="mt-1 md:hidden" />
                    </TableCell>
                    <TableCell className="hidden font-mono text-sm sm:table-cell">{r.trackingNumber || "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="hidden pr-5 whitespace-normal md:table-cell">
                      <Notes row={r} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {!preview && (
        <p className="text-sm text-muted-foreground">
          Nothing is saved until you press Import. Rows with errors or duplicates are skipped —{" "}
          <Link href={doneHref} className="font-medium text-foreground underline-offset-4 hover:underline">
            go back
          </Link>
          .
        </p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ImportRow["status"] }) {
  if (status === "ok")
    return (
      <Badge variant="outline" className="border-success/30 text-success">
        <CheckCircle2 /> Ready
      </Badge>
    )
  if (status === "duplicate")
    return (
      <Badge variant="outline" className="border-warning/30 text-warning">
        <AlertTriangle /> Exists
      </Badge>
    )
  return (
    <Badge variant="destructive">
      <XCircle /> Error
    </Badge>
  )
}

function Notes({ row, className }: { row: ImportRow; className?: string }) {
  if (!row.errors.length && !row.warnings.length) return null
  return (
    <ul className={cn("grid gap-0.5 text-sm font-normal", className)}>
      {row.errors.map((e) => (
        <li key={e} className="text-destructive">
          {e}
        </li>
      ))}
      {row.warnings.map((w) => (
        <li key={w} className="text-muted-foreground">
          {w}
        </li>
      ))}
    </ul>
  )
}
