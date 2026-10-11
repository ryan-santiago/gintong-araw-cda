"use client"

import { useRouter } from "next/navigation"
import { Loader2, LockOpen } from "lucide-react"
import { useAction } from "next-safe-action/hooks"

import { Button } from "@/components/ui/button"
import { startMeetingToday } from "@/features/meetings/actions"

export function StartTodayButton() {
  const router = useRouter()
  const { execute, isPending, result } = useAction(startMeetingToday, {
    onSuccess: ({ data }) => data && router.replace(`/attendance/capture?meeting=${data.id}`),
  })
  return (
    <div className="grid gap-2">
      <Button size="lg" onClick={() => execute({})} disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : <LockOpen />}
        Start today&apos;s meeting
      </Button>
      {result.serverError && <p className="text-sm text-destructive">{result.serverError}</p>}
    </div>
  )
}
