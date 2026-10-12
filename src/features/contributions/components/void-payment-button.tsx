"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ban, Loader2 } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { voidPayment } from "@/features/contributions/actions"

export function VoidPaymentButton({ id, summary }: { id: string; summary: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const { execute, isPending, result, reset } = useAction(voidPayment, {
    onSuccess: () => {
      toast.success("Payment voided.")
      setOpen(false)
      router.refresh()
    },
  })
  const [tooShort, setTooShort] = useState(false)
  const fieldError = tooShort ? "Say why this payment is being voided." : result.validationErrors?.reason?._errors?.[0]

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setReason("")
          setTooShort(false)
          reset()
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Void payment: ${summary}`}>
          <Ban className="text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void this payment?</AlertDialogTitle>
          <AlertDialogDescription>
            {summary}. The payment stays on record as voided and no longer counts toward the member&apos;s total. If the
            amount or date was wrong, record the correct payment after voiding.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <Label htmlFor={`void-${id}`}>Reason</Label>
          <Textarea
            id={`void-${id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Wrong amount, recorded twice"
            maxLength={200}
            aria-invalid={!!fieldError}
          />
          {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
        </div>
        {result.serverError && <p className="text-sm text-destructive">{result.serverError}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault()
              const short = reason.trim().length < 3
              setTooShort(short)
              if (!short) execute({ id, reason })
            }}
          >
            {isPending && <Loader2 className="animate-spin" />} Void payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
