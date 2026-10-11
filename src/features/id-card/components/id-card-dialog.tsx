"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Copy,
  Download,
  ExternalLink,
  FileText,
  IdCard,
  Image as ImageIcon,
  Loader2,
  Printer,
  RefreshCcw,
} from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { reissueCard } from "@/features/id-card/actions"
import { cn } from "@/lib/utils"

export function IdCardDialog({
  member,
  blockedReason,
  lastGenerated,
  publicUrl,
}: {
  member: { id: string; name: string }
  blockedReason: string | null
  lastGenerated: string | null
  publicUrl: string | null
}) {
  const router = useRouter()
  const [side, setSide] = useState<"front" | "back">("front")
  const [loaded, setLoaded] = useState<Record<string, boolean>>({})
  const [version, setVersion] = useState(0) // bumps after a reissue so previews refresh
  const base = `/api/members/${member.id}/id-card`
  const preview = (s: "front" | "back") => `${base}?side=${s}&format=png&dpi=200&v=${version}`
  const reissue = useAction(reissueCard, {
    onSuccess: () => {
      toast.success("New card issued. The old card's QR no longer works — print and hand over the new one.")
      setLoaded({})
      setVersion((v) => v + 1)
      router.refresh()
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't reissue the card."),
  })
  const file = (query: string) => `${base}?${query}&download=1`

  if (blockedReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button variant="outline" disabled>
              <IdCard /> ID card
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{blockedReason}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Dialog onOpenChange={(open) => !open && router.refresh()}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <IdCard /> ID card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>ID card — {member.name}</DialogTitle>
          <DialogDescription>
            3.375 × 2.125 in (CR80). Downloads are 600 DPI.{" "}
            {lastGenerated ? `Last generated ${lastGenerated}.` : "Not generated yet."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex w-fit gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Card side">
            {(["front", "back"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={side === s}
                onClick={() => setSide(s)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground capitalize",
                  side === s && "bg-card text-foreground shadow-card"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="relative aspect-[3.375/2.125] w-full overflow-hidden rounded-2xl bg-muted">
            {(["front", "back"] as const).map((s) => (
              // eslint-disable-next-line @next/next/no-img-element -- authenticated, generated image
              <img
                key={s}
                src={preview(s)}
                alt={`${s} of the ID card`}
                onLoad={() => setLoaded((l) => ({ ...l, [s]: true }))}
                className={cn("absolute inset-0 size-full object-contain", side !== s && "invisible")}
              />
            ))}
            {!loaded[side] && (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={file("side=front&format=png")} download>
                <ImageIcon /> Front PNG
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={file("side=back&format=png")} download>
                <Download /> Back PNG
              </a>
            </Button>
          </div>
          <Button asChild>
            <a href={file("format=pdf")} download>
              <Printer /> Print PDF (front + back)
            </a>
          </Button>
        </DialogFooter>
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          {publicUrl && (
            <>
              <Button asChild variant="ghost" size="sm">
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink /> Open member page
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(publicUrl)
                  toast.success("Link copied.")
                }}
              >
                <Copy /> Copy link
              </Button>
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:text-destructive">
                <RefreshCcw /> Reissue card
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reissue {member.name}&apos;s card?</AlertDialogTitle>
                <AlertDialogDescription>
                  Use this when a card is lost or stolen. The current card&apos;s QR code stops working immediately
                  (scanning it will be rejected) and a new QR is created. You&apos;ll need to print the new card.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  disabled={reissue.isPending}
                  onClick={() => reissue.execute({ memberId: member.id })}
                >
                  {reissue.isPending && <Loader2 className="animate-spin" />} Cancel old card &amp; reissue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <FileText className="mt-0.5 size-3.5 shrink-0" />
          PNG files are for sharing as a soft copy. Give the PDF to the PVC card printer: page 1 is the front, page 2
          the back.
        </p>
      </DialogContent>
    </Dialog>
  )
}
