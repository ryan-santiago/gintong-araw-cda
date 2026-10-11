"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlert, Loader2, LogIn } from "lucide-react"
import { useForm } from "react-hook-form"

import { PasswordInput } from "@/components/shared/password-input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { loginSchema, type LoginInput } from "@/features/auth/schema"
import { authClient } from "@/lib/auth-client"

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"
}

function messageFor(error: { code?: string; message?: string; status?: number }) {
  if (error.status === 429) return "Too many sign-in attempts. Please wait a minute and try again."
  if (error.code === "ACCOUNT_PENDING" || error.code === "ACCOUNT_SUSPENDED") return error.message
  if (error.code === "INVALID_EMAIL_OR_PASSWORD") return "Incorrect email or password."
  return error.message ?? "Something went wrong. Please try again."
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginInput) {
    setFormError(null)
    const { error } = await authClient.signIn.email({ email: values.email, password: values.password })
    if (error) {
      setFormError(messageFor(error) ?? null)
      return
    }
    router.replace(safeNext(searchParams.get("next")))
    router.refresh()
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
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <LogIn />}
          Sign in
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Forgot your password? Ask an administrator to reset it.
        </p>
        <p className="text-center text-sm">
          New officer or staff?{" "}
          <Link
            href="/register"
            className="font-semibold text-accent-foreground underline-offset-4 hover:underline dark:text-primary"
          >
            Request an account
          </Link>
        </p>
      </FieldGroup>
    </form>
  )
}
