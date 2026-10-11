"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlert, Loader2, Save, Sparkles, TriangleAlert } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { Controller, FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createMember, findBlockLotConflicts, suggestTrackingNumber, updateMember } from "@/features/members/actions"
import { AddressFields } from "@/features/members/components/address-fields"
import { PhotoPicker, type PhotoChange } from "@/features/members/components/photo-picker"
import { MEMBER_POSITIONS } from "@/features/members/positions"
import { emptyMember, memberSchema, type MemberInput } from "@/features/members/schema"

const LAST_ADDRESS_KEY = "ga:last-member-address"
const ADDRESS_KEYS = ["regionCode", "provinceCode", "cityCode", "barangayCode", "zipCode"] as const

function readLastAddress(): Partial<MemberInput> {
  try {
    return JSON.parse(localStorage.getItem(LAST_ADDRESS_KEY) ?? "{}")
  } catch {
    return {}
  }
}

export function MemberForm({
  member,
  canEditPhoto,
}: {
  member?: { id: string; values: MemberInput; photoUrl: string | null }
  canEditPhoto: boolean
}) {
  const router = useRouter()
  const isEdit = !!member
  const form = useForm<MemberInput>({
    resolver: zodResolver(memberSchema),
    defaultValues: member?.values ?? emptyMember,
  })
  const { errors, isSubmitting } = form.formState
  const [photo, setPhoto] = useState<PhotoChange>({ kind: "keep" })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const create = useAction(createMember)
  const update = useAction(updateMember)
  const suggest = useAction(suggestTrackingNumber, {
    onSuccess: ({ data }) => data && form.setValue("trackingNumber", data.trackingNumber, { shouldValidate: true }),
  })
  const conflicts = useAction(findBlockLotConflicts)

  // New member: suggest a tracking number and reuse the last address entered on this device.
  useEffect(() => {
    if (isEdit) return
    suggest.execute({})
    const last = readLastAddress()
    for (const key of ADDRESS_KEYS) if (last[key]) form.setValue(key, last[key] as string)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  function checkBlockLot() {
    const { blockNumber, lotNumber } = form.getValues()
    if (blockNumber.trim() && lotNumber.trim()) conflicts.execute({ blockNumber, lotNumber, excludeId: member?.id })
  }

  async function savePhoto(id: string) {
    if (photo.kind === "keep") return true
    const res =
      photo.kind === "set"
        ? await fetch(`/api/members/${id}/photo`, {
            method: "POST",
            body: (() => {
              const fd = new FormData()
              fd.append("file", photo.blob, "photo.jpg")
              return fd
            })(),
          })
        : await fetch(`/api/members/${id}/photo`, { method: "DELETE" })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      toast.error(`Member saved, but the photo wasn't: ${body.error ?? "upload failed"}`)
      return false
    }
    return true
  }

  async function onSubmit(values: MemberInput) {
    setFormError(null)
    setSaving(true)
    try {
      const result = isEdit
        ? await update.executeAsync({ ...values, id: member.id })
        : await create.executeAsync(values)
      if (!result?.data) {
        setFormError(result?.serverError ?? "Please check the highlighted fields.")
        return
      }
      const id = result.data.id
      if (!isEdit) {
        try {
          localStorage.setItem(
            LAST_ADDRESS_KEY,
            JSON.stringify(Object.fromEntries(ADDRESS_KEYS.map((k) => [k, values[k]])))
          )
        } catch {}
      }
      const photoOk = await savePhoto(id)
      if (photoOk) toast.success(isEdit ? "Member updated." : "Member added.")
      router.push(`/members/${id}`)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || isSubmitting
  const others = conflicts.result.data?.members ?? []

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4 xl:grid-cols-12">
        {formError && (
          <Alert variant="destructive" className="xl:col-span-12">
            <CircleAlert />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        {/* Identity */}
        <Card className="xl:col-span-7">
          <CardHeader>
            <CardTitle className="font-semibold">Member</CardTitle>
            <CardDescription>The primary contact of the household.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            {canEditPhoto && (
              <PhotoPicker currentUrl={member?.photoUrl ?? null} value={photo} onChange={setPhoto} disabled={busy} />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.firstName}>
                <FieldLabel htmlFor="firstName">
                  First name <Required />
                </FieldLabel>
                <Input
                  id="firstName"
                  autoComplete="off"
                  aria-invalid={!!errors.firstName}
                  {...form.register("firstName")}
                />
                <FieldError errors={[errors.firstName]} />
              </Field>
              <Field data-invalid={!!errors.middleName}>
                <FieldLabel htmlFor="middleName">Middle name</FieldLabel>
                <Input id="middleName" autoComplete="off" {...form.register("middleName")} />
                <FieldError errors={[errors.middleName]} />
              </Field>
              <Field data-invalid={!!errors.lastName}>
                <FieldLabel htmlFor="lastName">
                  Last name <Required />
                </FieldLabel>
                <Input
                  id="lastName"
                  autoComplete="off"
                  aria-invalid={!!errors.lastName}
                  {...form.register("lastName")}
                />
                <FieldError errors={[errors.lastName]} />
              </Field>
              <Field data-invalid={!!errors.suffix}>
                <FieldLabel htmlFor="suffix">Suffix</FieldLabel>
                <Input id="suffix" placeholder="Jr., Sr., III" {...form.register("suffix")} />
                <FieldError errors={[errors.suffix]} />
              </Field>
              <Field data-invalid={!!errors.birthDate}>
                <FieldLabel htmlFor="birthDate">Date of birth</FieldLabel>
                <Input id="birthDate" type="date" aria-invalid={!!errors.birthDate} {...form.register("birthDate")} />
                <FieldError errors={[errors.birthDate]} />
              </Field>
              <Field data-invalid={!!errors.contactNumber}>
                <FieldLabel htmlFor="contactNumber">Contact number</FieldLabel>
                <Input
                  id="contactNumber"
                  type="tel"
                  inputMode="tel"
                  placeholder="0917 123 4567"
                  aria-invalid={!!errors.contactNumber}
                  {...form.register("contactNumber")}
                />
                <FieldError errors={[errors.contactNumber]} />
              </Field>
              <Field className="sm:col-span-2" data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" aria-invalid={!!errors.email} {...form.register("email")} />
                <FieldError errors={[errors.email]} />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Membership */}
        <Card className="xl:col-span-5">
          <CardHeader>
            <CardTitle className="font-semibold">Membership</CardTitle>
            <CardDescription>Tracking number and lot assignment.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field data-invalid={!!errors.position}>
              <FieldLabel htmlFor="position">
                Position <Required />
              </FieldLabel>
              <Controller
                control={form.control}
                name="position"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="position" className="w-full" aria-invalid={!!errors.position}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEMBER_POSITIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.position]} />
            </Field>
            <Field data-invalid={!!errors.trackingNumber}>
              <FieldLabel htmlFor="trackingNumber">
                Tracking number <Required />
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="trackingNumber"
                  placeholder="2026-0001"
                  inputMode="numeric"
                  maxLength={9}
                  className="font-mono"
                  aria-invalid={!!errors.trackingNumber}
                  {...form.register("trackingNumber")}
                />
                {!isEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => suggest.execute({})}
                    disabled={suggest.isPending}
                    title="Suggest the next free number"
                  >
                    {suggest.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
                    <span className="hidden sm:inline">Suggest</span>
                  </Button>
                )}
              </div>
              <FieldDescription>Format YYYY-NNNN. The suggestion is the next free number this year.</FieldDescription>
              <FieldError errors={[errors.trackingNumber]} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.blockNumber}>
                <FieldLabel htmlFor="blockNumber">
                  Block <Required />
                </FieldLabel>
                <Input
                  id="blockNumber"
                  className="uppercase"
                  aria-invalid={!!errors.blockNumber}
                  {...form.register("blockNumber", { onBlur: checkBlockLot })}
                />
                <FieldError errors={[errors.blockNumber]} />
              </Field>
              <Field data-invalid={!!errors.lotNumber}>
                <FieldLabel htmlFor="lotNumber">
                  Lot <Required />
                </FieldLabel>
                <Input
                  id="lotNumber"
                  className="uppercase"
                  aria-invalid={!!errors.lotNumber}
                  {...form.register("lotNumber", { onBlur: checkBlockLot })}
                />
                <FieldError errors={[errors.lotNumber]} />
              </Field>
            </div>
            {others.length > 0 && (
              <Alert className="border-warning/40 bg-warning/10">
                <TriangleAlert className="text-warning" />
                <AlertDescription>
                  Also on this block and lot:{" "}
                  {others.map((o, i) => (
                    <span key={o.id}>
                      {i > 0 && ", "}
                      <Link href={`/members/${o.id}`} className="font-semibold underline-offset-2 hover:underline">
                        {o.name}
                      </Link>
                      {!o.isActive && " (inactive)"}
                    </span>
                  ))}
                  . You can still save.
                </AlertDescription>
              </Alert>
            )}
            <Field data-invalid={!!errors.memberSince}>
              <FieldLabel htmlFor="memberSince">Member since</FieldLabel>
              <Input
                id="memberSince"
                type="date"
                aria-invalid={!!errors.memberSince}
                {...form.register("memberSince")}
              />
              <FieldDescription>When the household joined the association.</FieldDescription>
              <FieldError errors={[errors.memberSince]} />
            </Field>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="xl:col-span-12">
          <CardHeader>
            <CardTitle className="font-semibold">Current address</CardTitle>
            <CardDescription>
              Optional. New members start with the last address you entered on this device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddressFields />
          </CardContent>
        </Card>

        <div className="sticky bottom-24 z-10 flex justify-end gap-2 md:bottom-4 xl:col-span-12">
          <div className="flex gap-2 rounded-2xl bg-card/90 p-2 shadow-card backdrop-blur">
            <Button asChild variant="outline" size="lg">
              <Link href={isEdit ? `/members/${member.id}` : "/members"}>Cancel</Link>
            </Button>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Save />}
              {isEdit ? "Save changes" : "Add member"}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  )
}

function Required() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  )
}
