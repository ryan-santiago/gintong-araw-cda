import type { Metadata } from "next"

import { RegisterForm } from "@/features/auth/components/register-form"

export const metadata: Metadata = { title: "Request an account" }

export default function RegisterPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Request an account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For association officers and staff. An administrator approves every account.
        </p>
      </div>
      <RegisterForm />
    </>
  )
}
