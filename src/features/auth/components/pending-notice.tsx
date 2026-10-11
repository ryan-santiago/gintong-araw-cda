"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Hourglass, LogOut, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function PendingNotice() {
  const router = useRouter()
  const noAccess = useSearchParams().get("reason") === "no-access"

  async function signOut() {
    await authClient.signOut()
    router.replace("/login")
    router.refresh()
  }

  const Icon = noAccess ? ShieldAlert : Hourglass

  return (
    <div className="grid justify-items-center gap-4 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="size-6" />
      </span>
      <div>
        <h1 className="text-xl font-bold">{noAccess ? "No access assigned yet" : "Waiting for approval"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {noAccess
            ? "Your account is active but isn't in any group. Ask an administrator to assign you a group."
            : "An administrator needs to approve your account before you can sign in."}
        </p>
      </div>
      <Button variant="outline" size="lg" className="w-full" onClick={signOut}>
        <LogOut /> Back to sign in
      </Button>
    </div>
  )
}
