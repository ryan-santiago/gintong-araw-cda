import { Suspense } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"
import { ChangePasswordForm } from "@/features/auth/components/change-password-form"
import { getViewer } from "@/lib/rbac"

export const metadata: Metadata = { title: "Change password" }

async function ChangePassword() {
  const viewer = await getViewer()
  if (!viewer) redirect("/login?next=/change-password")
  if (viewer.status !== "ACTIVE") redirect("/pending")
  const forced = viewer.mustChangePassword

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{forced ? "Set a new password" : "Change password"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {forced
            ? "An administrator reset your password. Choose a new one to continue."
            : `Signed in as ${viewer.email}.`}
        </p>
      </div>
      <ChangePasswordForm forced={forced} />
    </>
  )
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <ChangePassword />
    </Suspense>
  )
}
