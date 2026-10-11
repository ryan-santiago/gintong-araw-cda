"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarDays, CircleAlert, Loader2, Save, TriangleAlert } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveSettings } from "@/features/settings/actions"
import { settingsSchema, WEEKDAYS, type AppSettings } from "@/features/settings/schema"

export function SettingsForm({ initial }: { initial: AppSettings }) {
  const router = useRouter()
  const form = useForm<AppSettings>({ resolver: zodResolver(settingsSchema), defaultValues: initial })
  const { execute, isPending, result } = useAction(saveSettings, {
    onSuccess: () => {
      toast.success("Settings saved.")
      form.reset(form.getValues())
      router.refresh()
    },
  })
  const { errors, isDirty } = form.formState

  return (
    <form onSubmit={form.handleSubmit((values) => execute(values))} noValidate className="grid gap-4 lg:grid-cols-2">
      {result.serverError && (
        <Alert variant="destructive" className="lg:col-span-2">
          <CircleAlert />
          <AlertDescription>{result.serverError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-semibold">
            <CalendarDays className="size-4 text-secondary" /> Meeting defaults
          </CardTitle>
          <CardDescription>Pre-filled when creating a meeting or using “Start today’s meeting”.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.meetingDay}>
              <FieldLabel htmlFor="meetingDay">Usual meeting day</FieldLabel>
              <Controller
                control={form.control}
                name="meetingDay"
                render={({ field }) => (
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger id="meetingDay" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((day, i) => (
                        <SelectItem key={day} value={String(i)}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldDescription>New meetings default to the next one of this day.</FieldDescription>
            </Field>
            <Field data-invalid={!!errors.meetingTitle}>
              <FieldLabel htmlFor="meetingTitle">Default title</FieldLabel>
              <Input id="meetingTitle" aria-invalid={!!errors.meetingTitle} {...form.register("meetingTitle")} />
              <FieldError errors={[errors.meetingTitle]} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.meetingTime}>
                <FieldLabel htmlFor="meetingTime">Start time</FieldLabel>
                <Input id="meetingTime" type="time" {...form.register("meetingTime")} />
                <FieldError errors={[errors.meetingTime]} />
              </Field>
              <Field data-invalid={!!errors.meetingLocation}>
                <FieldLabel htmlFor="meetingLocation">Location</FieldLabel>
                <Input id="meetingLocation" placeholder="e.g. Covered court" {...form.register("meetingLocation")} />
                <FieldError errors={[errors.meetingLocation]} />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="self-start">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-semibold">
            <TriangleAlert className="size-4 text-warning" /> Members at risk
          </CardTitle>
          <CardDescription>Flags active members who stopped attending.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.atRiskThreshold}>
              <FieldLabel htmlFor="atRiskThreshold">Missed meetings in a row</FieldLabel>
              <Input
                id="atRiskThreshold"
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                className="w-32"
                aria-invalid={!!errors.atRiskThreshold}
                {...form.register("atRiskThreshold")}
              />
              <FieldDescription>
                Only closed meetings count, and only those held after the member was added.
              </FieldDescription>
              <FieldError errors={[errors.atRiskThreshold]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end lg:col-span-2">
        <Button type="submit" size="lg" disabled={isPending || !isDirty}>
          {isPending ? <Loader2 className="animate-spin" /> : <Save />} Save settings
        </Button>
      </div>
    </form>
  )
}
