import { Suspense } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { LoginForm } from "@/features/auth/components/login-form"
import { getViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Sign in" }

async function RedirectIfSignedIn() {
  const viewer = await getViewer()
  if (viewer?.status === "ACTIVE") redirect(viewer.mustChangePassword ? "/change-password" : "/dashboard")
  return null
}

export default function LoginPage() {
  return (
    <>
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to manage members and attendance.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  )
}
