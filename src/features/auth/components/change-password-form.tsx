"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlert, KeyRound, Loader2 } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { PasswordInput } from "@/components/shared/password-input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { changePasswordAction } from "@/features/auth/actions"
import { changePasswordSchema, type ChangePasswordInput } from "@/features/auth/schema"

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter()
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  const { execute, result, isPending } = useAction(changePasswordAction, {
    onSuccess: () => {
      toast.success("Password changed.")
      router.replace("/dashboard")
      router.refresh()
    },
  })

  const { errors } = form.formState

  return (
    <form onSubmit={form.handleSubmit((values) => execute(values))} noValidate>
      <FieldGroup>
        {result.serverError && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{result.serverError}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={!!errors.currentPassword}>
          <FieldLabel htmlFor="currentPassword">{forced ? "Temporary password" : "Current password"}</FieldLabel>
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            aria-invalid={!!errors.currentPassword}
            {...form.register("currentPassword")}
          />
          <FieldError errors={[errors.currentPassword]} />
        </Field>
        <Field data-invalid={!!errors.newPassword}>
          <FieldLabel htmlFor="newPassword">New password</FieldLabel>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            {...form.register("newPassword")}
          />
          <FieldDescription>At least 8 characters, with a letter and a number.</FieldDescription>
          <FieldError errors={[errors.newPassword]} />
        </Field>
        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...form.register("confirmPassword")}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
          Change password
        </Button>
        {!forced && (
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        )}
      </FieldGroup>
    </form>
  )
}
