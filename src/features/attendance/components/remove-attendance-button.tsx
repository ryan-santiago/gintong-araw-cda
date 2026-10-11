"use client"

import { useRouter } from "next/navigation"
import { Loader2, X } from "lucide-react"
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
import { removeAttendance } from "@/features/attendance/actions"

export function RemoveAttendanceButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const { execute, isPending, result } = useAction(removeAttendance, {
    onSuccess: () => {
      toast.success(`Removed ${name}'s check-in.`)
      router.refresh()
    },
  })
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Remove ${name}'s check-in`}>
          <X />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this check-in?</AlertDialogTitle>
          <AlertDialogDescription>
            {name} will be marked as not present for this meeting. The removal is recorded in the audit trail.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {result.serverError && <p className="text-sm text-destructive">{result.serverError}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault()
              execute({ id })
            }}
          >
            {isPending && <Loader2 className="animate-spin" />} Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
