"use client"

import { useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlert, Hourglass, Loader2, UserPlus } from "lucide-react"
import { useForm } from "react-hook-form"

import { PasswordInput } from "@/components/shared/password-input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { registerSchema, type RegisterInput } from "@/features/auth/schema"
import { authClient } from "@/lib/auth-client"

export function RegisterForm() {
  const [formError, setFormError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  })

  async function onSubmit(values: RegisterInput) {
    setFormError(null)
    const { error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    })
    if (error) {
      setFormError(
        error.status === 429
          ? "Too many attempts. Please wait a few minutes and try again."
          : error.code === "USER_ALREADY_EXISTS" || error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
            ? "An account with this email already exists."
            : (error.message ?? "Something went wrong. Please try again.")
      )
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="grid justify-items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Hourglass className="size-6" />
        </span>
        <div>
          <h2 className="text-xl font-bold">Request sent</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            An administrator will review your account. You can sign in once it has been approved.
          </p>
        </div>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    )
  }

  const { errors, isSubmitting } = form.formState

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {formError && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...form.register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          <FieldDescription>At least 8 characters, with a letter and a number.</FieldDescription>
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...form.register("confirmPassword")}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus />}
          Request account
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By requesting an account you agree to our{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Data Privacy Notice
          </Link>
          .
        </p>
        <p className="text-center text-sm">
          Already approved?{" "}
          <Link
            href="/login"
            className="font-semibold text-accent-foreground underline-offset-4 hover:underline dark:text-primary"
          >
            Sign in
          </Link>
        </p>
      </FieldGroup>
    </form>
  )
}
