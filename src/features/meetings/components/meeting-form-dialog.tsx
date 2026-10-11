"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlert, Loader2, Save } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { saveMeeting } from "@/features/meetings/actions"
import { meetingSchema, type MeetingInput } from "@/features/meetings/schema"

export function MeetingFormDialog({
  initial,
  defaults,
  trigger,
}: {
  initial?: MeetingInput & { id: string }
  /** New-meeting defaults from Settings (date = next meeting day). */
  defaults?: { date: string; title: string; startTime: string; location: string }
  trigger: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const values: MeetingInput = initial ?? {
    title: defaults?.title ?? "General Assembly",
    date: defaults?.date ?? "",
    startTime: defaults?.startTime ?? "",
    location: defaults?.location ?? "",
    notes: "",
  }
  const form = useForm<MeetingInput>({ resolver: zodResolver(meetingSchema), defaultValues: values })
  const { execute, isPending, result, reset } = useAction(saveMeeting, {
    onSuccess: ({ data }) => {
      toast.success(initial ? "Meeting updated." : "Meeting created.")
      setOpen(false)
      if (!initial && data) router.push(`/meetings/${data.id}`)
      router.refresh()
    },
  })
  const { errors } = form.formState

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) {
          form.reset(values)
          reset()
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit((values) => execute({ ...values, id: initial?.id }))} noValidate>
          <DialogHeader>
            <DialogTitle>{initial ? "Edit meeting" : "New meeting"}</DialogTitle>
            <DialogDescription>Meetings are usually on Sunday, but any day works.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="my-5">
            {result.serverError && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{result.serverError}</AlertDescription>
              </Alert>
            )}
            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input id="title" aria-invalid={!!errors.title} {...form.register("title")} />
              <FieldError errors={[errors.title]} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.date}>
                <FieldLabel htmlFor="date">Date</FieldLabel>
                <Input id="date" type="date" aria-invalid={!!errors.date} {...form.register("date")} />
                <FieldError errors={[errors.date]} />
              </Field>
              <Field data-invalid={!!errors.startTime}>
                <FieldLabel htmlFor="startTime">Start time</FieldLabel>
                <Input id="startTime" type="time" aria-invalid={!!errors.startTime} {...form.register("startTime")} />
                <FieldError errors={[errors.startTime]} />
              </Field>
            </div>
            <Field data-invalid={!!errors.location}>
              <FieldLabel htmlFor="location">Location</FieldLabel>
              <Input id="location" placeholder="e.g. Covered court" {...form.register("location")} />
              <FieldError errors={[errors.location]} />
            </Field>
            <Field data-invalid={!!errors.notes}>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea id="notes" rows={3} {...form.register("notes")} />
              <FieldError errors={[errors.notes]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <Save />}
              {initial ? "Save" : "Create meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
