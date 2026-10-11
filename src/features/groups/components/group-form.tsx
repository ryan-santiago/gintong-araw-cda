"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlert, Loader2, Save } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { saveGroup } from "@/features/groups/actions"
import { groupSchema, type GroupInput } from "@/features/groups/schema"
import { PERMISSION_MODULES, PERMISSIONS, type PermissionKey } from "@/lib/permissions"
import { cn } from "@/lib/utils"

export function GroupForm({
  initial,
  readOnly,
  heldPermissions,
  minRank,
}: {
  initial?: GroupInput & { id: string }
  readOnly: boolean
  heldPermissions: PermissionKey[]
  minRank: number
}) {
  const router = useRouter()
  const form = useForm<GroupInput>({
    resolver: zodResolver(groupSchema),
    defaultValues: initial ?? { name: "", description: "", rank: Math.max(minRank, 50), permissions: [] },
  })

  const { execute, isPending, result } = useAction(saveGroup, {
    onSuccess: () => {
      toast.success(initial ? "Group saved." : "Group created.")
      router.push("/groups")
      router.refresh()
    },
  })

  const { errors } = form.formState
  const held = new Set(heldPermissions)

  return (
    <form onSubmit={form.handleSubmit((values) => execute({ ...values, id: initial?.id }))} noValidate>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="font-semibold">Details</CardTitle>
            <CardDescription>Who this group is for and where it sits in the hierarchy.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {result.serverError && (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertDescription>{result.serverError}</AlertDescription>
                </Alert>
              )}
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" disabled={readOnly} aria-invalid={!!errors.name} {...form.register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field data-invalid={!!errors.rank}>
                <FieldLabel htmlFor="rank">Rank</FieldLabel>
                <Input
                  id="rank"
                  type="number"
                  inputMode="numeric"
                  min={minRank}
                  max={999}
                  disabled={readOnly}
                  aria-invalid={!!errors.rank}
                  className="font-mono"
                  {...form.register("rank")}
                />
                <FieldDescription>
                  Lower number = more authority. Yours is {minRank - 1}, so use {minRank} or higher.
                </FieldDescription>
                <FieldError errors={[errors.rank]} />
              </Field>
              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  rows={3}
                  disabled={readOnly}
                  aria-invalid={!!errors.description}
                  {...form.register("description")}
                />
                <FieldError errors={[errors.description]} />
              </Field>
              {!readOnly && (
                <div className="flex gap-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/groups">Cancel</Link>
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin" /> : <Save />}
                    Save
                  </Button>
                </div>
              )}
            </FieldGroup>
          </CardContent>
        </Card>

        <Controller
          control={form.control}
          name="permissions"
          render={({ field }) => {
            const selected = new Set(field.value)
            const toggle = (key: PermissionKey, on: boolean) =>
              field.onChange(on ? [...selected, key] : [...selected].filter((k) => k !== key))

            return (
              <Card>
                <CardHeader>
                  <CardTitle className="font-semibold">Permissions</CardTitle>
                  <CardDescription>
                    {selected.size} selected. You can only grant permissions you have yourself.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {PERMISSION_MODULES.map(({ module, keys }) => {
                    const grantable = keys.filter((k) => held.has(k))
                    const allOn = grantable.length > 0 && grantable.every((k) => selected.has(k))
                    return (
                      <fieldset key={module} className="rounded-xl border p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <legend className="text-sm font-bold">{module}</legend>
                          {!readOnly && grantable.length > 1 && (
                            <button
                              type="button"
                              className="text-xs font-semibold text-accent-foreground hover:underline dark:text-primary"
                              onClick={() =>
                                field.onChange(
                                  allOn
                                    ? [...selected].filter((k) => !grantable.includes(k))
                                    : [...new Set([...selected, ...grantable])]
                                )
                              }
                            >
                              {allOn ? "Clear" : "Select all"}
                            </button>
                          )}
                        </div>
                        <div className="grid gap-1">
                          {keys.map((key) => {
                            const disabled = readOnly || !held.has(key)
                            return (
                              <label
                                key={key}
                                className={cn(
                                  "flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted",
                                  disabled && "opacity-60 hover:bg-transparent"
                                )}
                              >
                                <Checkbox
                                  className="mt-0.5"
                                  checked={selected.has(key)}
                                  disabled={disabled}
                                  onCheckedChange={(on) => toggle(key, on === true)}
                                />
                                <span className="grid">
                                  <span className="text-sm">{PERMISSIONS[key].description}</span>
                                  <span className="font-mono text-[11px] text-muted-foreground">{key}</span>
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </fieldset>
                    )
                  })}
                </CardContent>
              </Card>
            )
          }}
        />
      </div>
    </form>
  )
}
