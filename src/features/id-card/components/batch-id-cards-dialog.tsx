"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { CircleAlert, IdCard, Loader2, Printer } from "lucide-react"
import { useAction } from "next-safe-action/hooks"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { getIdCardBatch } from "@/features/id-card/actions"

const CARD_PT = { width: 3.375 * 72, height: 2.125 * 72 }
const CONCURRENCY = 3

async function fetchJpg(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return new Uint8Array(await res.arrayBuffer())
}

export function BatchIdCardsDialog() {
  const searchParams = useSearchParams()
  const batch = useAction(getIdCardBatch)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [failures, setFailures] = useState<string[]>([])
  const [running, setRunning] = useState(false)

  const data = batch.result.data

  function onOpenChange(open: boolean) {
    if (!open) return
    setProgress(null)
    setFailures([])
    const params = Object.fromEntries(searchParams.entries())
    delete params.page
    batch.execute({ params })
  }

  async function generate() {
    if (!data?.members.length) return
    setRunning(true)
    setFailures([])
    const members = data.members
    setProgress({ done: 0, total: members.length })
    try {
      const { PDFDocument } = await import("pdf-lib")
      const pdf = await PDFDocument.create()
      pdf.setTitle("Gintong Araw CDA — ID cards")
      const back = await pdf.embedJpg(
        await fetchJpg(`/api/members/${members[0]!.id}/id-card?side=back&format=jpg&dpi=600`)
      )

      const fronts: (Uint8Array | null)[] = new Array(members.length).fill(null)
      const failed: string[] = []
      let next = 0
      let done = 0
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, members.length) }, async () => {
          while (next < members.length) {
            const i = next++
            const m = members[i]!
            try {
              fronts[i] = await fetchJpg(
                `/api/members/${m.id}/id-card?side=front&format=jpg&dpi=600&download=1&batch=1`
              )
            } catch (e) {
              failed.push(`${m.name} (${m.trackingNumber}): ${(e as Error).message}`)
            }
            setProgress({ done: ++done, total: members.length })
          }
        })
      )

      for (const bytes of fronts) {
        if (!bytes) continue
        const image = await pdf.embedJpg(bytes)
        pdf.addPage([CARD_PT.width, CARD_PT.height]).drawImage(image, { x: 0, y: 0, ...CARD_PT })
        pdf.addPage([CARD_PT.width, CARD_PT.height]).drawImage(back, { x: 0, y: 0, ...CARD_PT })
      }
      setFailures(failed)

      if (pdf.getPageCount() > 0) {
        const blob = new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        const stamp = new Date().toISOString().slice(0, 10)
        a.href = url
        a.download = `gintong-araw-id-cards-${stamp}-${pdf.getPageCount() / 2}.pdf`
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }
    } catch (e) {
      setFailures([(e as Error).message])
    } finally {
      setRunning(false)
    }
  }

  const pct = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10">
          <IdCard /> ID cards
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Print ID cards</DialogTitle>
          <DialogDescription>
            Creates one print-ready PDF (front + back per member, 600 DPI) for the active members matching your current
            filters.
          </DialogDescription>
        </DialogHeader>

        {batch.isPending && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Checking members…
          </div>
        )}
        {batch.result.serverError && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{batch.result.serverError}</AlertDescription>
          </Alert>
        )}

        {data && (
          <div className="grid gap-3 text-sm">
            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="text-2xl font-bold tabular-nums">{data.members.length}</p>
              <p className="text-muted-foreground">
                card{data.members.length === 1 ? "" : "s"} ready
                {data.total > data.limit &&
                  ` — showing the first ${data.limit} of ${data.total}. Filter by block to print the rest.`}
              </p>
            </div>
            {data.withoutPhoto.length > 0 && (
              <Alert className="border-warning/40 bg-warning/10">
                <CircleAlert className="text-warning" />
                <AlertDescription>
                  {data.withoutPhoto.length} member{data.withoutPhoto.length === 1 ? " has" : "s have"} no photo and
                  will be skipped:{" "}
                  {data.withoutPhoto
                    .slice(0, 5)
                    .map((m) => m.name)
                    .join(", ")}
                  {data.withoutPhoto.length > 5 && `, and ${data.withoutPhoto.length - 5} more`}.
                </AlertDescription>
              </Alert>
            )}
            {progress && (
              <div className="grid gap-1.5">
                <Progress value={pct} />
                <p className="text-xs text-muted-foreground tabular-nums">
                  {running ? "Generating" : "Done"} {progress.done} / {progress.total}
                </p>
              </div>
            )}
            {failures.length > 0 && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {failures.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={generate} disabled={!data?.members.length || running}>
            {running ? <Loader2 className="animate-spin" /> : <Printer />}
            {running ? "Generating…" : "Generate PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
